// АЗИМЕР — Telegram bot webhook handler.
// Обрабатывает callback-кнопки (смена статуса заявки) и команды (/leads, /stats, /kp, /help).
//
// Деплой: supabase functions deploy telegram-bot --no-verify-jwt
// Env:    supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... ADMIN_CHAT_IDS=<chat_id_1>,<chat_id_2>
// Webhook: curl https://api.telegram.org/bot<TOKEN>/setWebhook \
//            -d url=https://<ref>.supabase.co/functions/v1/telegram-bot \
//            -d secret_token=<SECRET>
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Полный движок калькулятора v3 — bundled из lib/calculator/ через esbuild
// (scripts/build-bot-bundle.mts). Тот же расчёт что на сайте — один источник правды.
import {
  calculate as engineCalculate,
  formatRub,
  CATALOG_VERSION,
} from "../_shared/calculator.bundle.js";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://azimer.ru";

// ════════════════════════════════════════════════════════════════
// ──── WIZARD (inlined из wizard.ts чтобы Dashboard деплоился) ────
// ════════════════════════════════════════════════════════════════

type StepKey =
  | 'client_name' | 'phone' | 'region' | 'object_type'
  | 'length' | 'width' | 'height'
  | 'frame' | 'cladding' | 'cladding_thk' | 'roofing'
  | 'foundation'
  | 'gates' | 'windows' | 'doors'
  | 'crane'
  | 'notes'
  | 'confirm'
  | 'done';

interface Collected {
  client_name?: string;
  phone?:       string;
  region?:      string;       // ID региона из regions.ts
  object_type?: string;
  length?:      number;
  width?:       number;
  height?:      number;
  frame?:       string;
  cladding?:    string;
  cladding_thk?: number;      // 50/80/100/120/150/200/250 мм
  roofing?:     string;
  foundation?:  string;
  gates?:       { size: string; count: number }[];
  windows?:     { size: string; count: number }[];
  doors?:       { count: number; note?: string };
  crane_t?:     number;       // НОВОЕ: грузоподъёмность крана в тоннах (0 = нет крана)
  notes?:       string;
}

const OBJECT_TYPES = [
  { id: 'sklad',      label: 'Склад' },
  { id: 'angar',      label: 'Ангар' },
  { id: 'production', label: 'Производство' },
  { id: 'commercial', label: 'Коммерческое' },
  { id: 'naves',      label: 'Навес' },
  { id: 'modular',    label: 'Модульное' },
];

// rate-поля удалены: цены теперь считает engine из БД через bundle (catalog.generated.ts)
const FRAMES = [
  { id: 'lstk',    label: 'ЛСТК' },
  { id: 'metal',   label: 'Металлокаркас' },
  { id: 'modular', label: 'Модульный' },
];

const CLADDINGS = [
  { id: 'none',             label: 'Без стен' },
  { id: 'proflist',         label: 'Профлист' },
  { id: 'sandwich_minvata', label: 'Сэндвич минвата' },
  { id: 'sandwich_pir',     label: 'Сэндвич PIR' },
];

const ROOFINGS = [
  { id: 'proflist', label: 'Профлист' },
  { id: 'sandwich', label: 'Сэндвич' },
];

const FOUNDATIONS = [
  { id: 'none',  label: 'Без фундамента' },
  { id: 'pile',  label: 'Свайно-винтовой' },
  { id: 'strip', label: 'Ленточный' },
  { id: 'slab',  label: 'Плита 200мм' },
];

// Регионы строительства (для нового шага визарда). ID совпадает с lib/calculator/regions.ts
const REGIONS_BOT: Record<string, string> = {
  krsk_city:       'Красноярск + пригороды',
  krsk_south:      'Юг края + Хакасия',
  krsk_kansk:      'Канск / Ачинск',
  krsk_north_pre:  'Лесосибирск / Енисейск',
  krsk_priangar:   'Богучаны / Кодинск',
  krsk_evenkia:    'Эвенкия (мерзлота)',
  krsk_taymyr:     'Таймыр / Норильск',
  other:           'Другой регион',
};

// ────────────────── Маппинг Wizard state → BuildingInput движка ──────────────────

const mapFrame = (s?: string) =>
  s === 'lstk' ? 'lstk' : s === 'metal' ? 'metal' : 'modular' as const;

const mapCladding = (s?: string) =>
  s === 'proflist'         ? 'proflist'
  : s === 'sandwich_minvata' ? 'sandwich_minvata'
  : s === 'sandwich_pir'     ? 'sandwich_pir'
  : 'none' as const;

// В Wizard бот использует короткое 'sandwich' (без расщепления minvata/pir).
// Кровельная панель: по умолчанию минвата (стандарт рынка); если стены PIR — кровля тоже PIR.
const mapRoofing = (roofing: string | undefined, cladding: string | undefined) => {
  if (roofing === 'sandwich') {
    return cladding === 'sandwich_pir' ? 'sandwich_pir' : 'sandwich_minvata';
  }
  return 'proflist' as const;
};

const mapFoundation = (s?: string) =>
  s === 'pile'  ? 'pile_screw'
  : s === 'strip' ? 'strip'
  : s === 'slab'  ? 'slab_200'
  : 'none' as const;

function mapWizardToInput(c: Collected): any {
  const cladding = mapCladding(c.cladding);
  const roofing  = mapRoofing(c.roofing, c.cladding);
  const thk = (c.cladding_thk ?? 150) as any;
  return {
    objectType:  (c.object_type ?? 'sklad') as any,
    region:      c.region || undefined,
    length:      c.length ?? 0,
    width:       c.width ?? 0,
    height:      c.height ?? 0,
    frame:       mapFrame(c.frame),
    cladding,
    claddingThk: cladding === 'sandwich_minvata' || cladding === 'sandwich_pir' ? thk : undefined,
    roofing,
    roofingThk:  roofing === 'sandwich_minvata' || roofing === 'sandwich_pir'  ? thk : undefined,
    foundation:  mapFoundation(c.foundation),
    gates:       c.gates ?? [],
    windows:     c.windows ?? [],
    doors:       { count: c.doors?.count ?? 0 },
    craneCapacityT: (c.crane_t ?? 0) > 0 ? c.crane_t : undefined,
  };
}

// ────────────────── Обёртка: единый формат как был у старого calcEstimate ──────────────────
// Возвращает то что ждут formatSummary и finalizeKpAndCreateLead.
// Под капотом — полный engine v3 + распределение НР/СП/маржи пропорционально группам
// (как в lib/pricing.ts), чтобы клиент НЕ видел отдельной строки «наценка»

const GROUP_LABELS: Record<string, string> = {
  frame:      'Каркас',
  walls:      'Стеновое ограждение',
  roof:       'Кровля',
  foundation: 'Фундамент',
  openings:   'Доборные элементы',
  logistics:  'Логистика',
};

function calcEstimate(c: Collected) {
  const input = mapWizardToInput(c);
  if ((input.length ?? 0) <= 0 || (input.width ?? 0) <= 0 || input.height <= 0) {
    return { lines: [], total: 0, low: 0, high: 0, complexity: 'TYPICAL', flags: [] as string[] };
  }
  const est = engineCalculate(input);

  // Суммируем по группам, добавляем мультипликатор для пропорционального распределения
  // накладных/маржи/наценки — как в lib/pricing.ts calcEstimate
  const groupSums: Record<string, number> = {};
  for (const l of est.lines) groupSums[l.group] = (groupSums[l.group] ?? 0) + l.total;
  const directSum = Object.values(groupSums).reduce((s, v) => s + v, 0);
  const multiplier = directSum > 0 ? est.totals.final / directSum : 1;

  const lines: { label: string; value: number }[] = [];
  for (const [g, v] of Object.entries(groupSums)) {
    if (v > 0) lines.push({ label: GROUP_LABELS[g] ?? g, value: Math.round(v * multiplier) });
  }

  return {
    lines,
    total: est.totals.final,
    low:   est.totals.low,
    high:  est.totals.high,
    complexity: est.complexity,
    flags: est.flags,
  };
}

function parsePhone(s: string): string | null {
  const digits = s.replace(/\D/g, '');
  if (digits.length === 11) return '+' + (digits[0] === '8' ? '7' + digits.slice(1) : digits);
  if (digits.length === 10) return '+7' + digits;
  return null;
}
function parseDimension(s: string): number | null {
  const cleaned = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0 || n > 200) return null;
  return n;
}
function parseInt0(s: string): number | null {
  const n = parseInt(s.trim(), 10);
  if (isNaN(n) || n < 0) return null;
  return n;
}
function parseItems(s: string): { size: string; count: number }[] | null {
  const trimmed = s.trim().toLowerCase();
  if (trimmed === 'нет' || trimmed === 'не нужно' || trimmed === 'не нужны' || trimmed === '-') return [];
  const result: { size: string; count: number }[] = [];
  if (trimmed.includes('=')) {
    for (const part of trimmed.split(',')) {
      const [size, countStr] = part.split('=').map(x => x.trim());
      const count = parseInt(countStr, 10);
      if (size && !isNaN(count) && count > 0) result.push({ size, count });
    }
    return result.length ? result : null;
  }
  const justNum = parseInt(trimmed, 10);
  if (!isNaN(justNum) && justNum > 0 && trimmed === String(justNum)) {
    return [{ size: 'стандарт', count: justNum }];
  }
  const m = trimmed.match(/^(\d+)\s*[x×х]\s*(.+)$/);
  if (m) {
    const count = parseInt(m[1], 10);
    const size = m[2].trim();
    if (!isNaN(count) && count > 0) return [{ size, count }];
  }
  return null;
}

interface Step {
  key: StepKey;
  prompt: string;
  next: StepKey;
  type: 'text' | 'buttons' | 'numeric' | 'optional_text';
  buttons?: { text: string; data: string }[][];
  optional?: boolean;
}

const STEPS: Record<StepKey, Step> = {
  client_name: { key: 'client_name', type: 'text', next: 'phone',
    prompt: '1/14  <b>Имя клиента или название компании:</b>\nПример: Иванов И.И. или ООО Сибсталь' },
  phone: { key: 'phone', type: 'text', next: 'region',
    prompt: '2/14  <b>Телефон клиента:</b>\nПример: +7 999 123 45 67' },
  region: { key: 'region', type: 'buttons', next: 'object_type',
    prompt: '3/14  <b>Где строим?</b>\nВыбор влияет на снеговую нагрузку, сейсмику, мерзлоту',
    buttons: [
      [{ text: 'Красноярск + пригороды',     data: 'w:region:krsk_city' }],
      [{ text: 'Юг края (Минусинск, Хакасия)', data: 'w:region:krsk_south' }],
      [{ text: 'Канск / Ачинск',             data: 'w:region:krsk_kansk' }],
      [{ text: 'Лесосибирск / Енисейск',     data: 'w:region:krsk_north_pre' }],
      [{ text: 'Богучаны / Кодинск (V зона)', data: 'w:region:krsk_priangar' }],
      [{ text: '❄️ Эвенкия (мерзлота)',     data: 'w:region:krsk_evenkia' }],
      [{ text: '❄️ Таймыр / Норильск',      data: 'w:region:krsk_taymyr' }],
      [{ text: 'Тува / Кемерово / Иркутск',  data: 'w:region:other' }],
    ] },
  object_type: { key: 'object_type', type: 'buttons', next: 'length',
    prompt: '4/15  <b>Тип объекта:</b>',
    buttons: [
      [{ text: 'Склад',        data: 'w:object_type:sklad' },      { text: 'Ангар',        data: 'w:object_type:angar' }],
      [{ text: 'Производство', data: 'w:object_type:production' }, { text: 'Коммерческое', data: 'w:object_type:commercial' }],
      [{ text: 'Навес',        data: 'w:object_type:naves' },      { text: 'Модульное',    data: 'w:object_type:modular' }],
      [{ text: '🏕 Арочный тент (эконом-линейка)', data: 'w:object_type:tent_arched' }],
    ] },
  length: { key: 'length', type: 'numeric', next: 'width',
    prompt: '5/14  <b>Длина в метрах:</b>\nПример: 18' },
  width: { key: 'width', type: 'numeric', next: 'height',
    prompt: '6/14  <b>Ширина в метрах:</b>\nПример: 6' },
  height: { key: 'height', type: 'numeric', next: 'frame',
    prompt: '7/14  <b>Высота в метрах:</b>\nПример: 4' },
  frame: { key: 'frame', type: 'buttons', next: 'cladding',
    prompt: '8/14  <b>Каркас:</b>',
    buttons: [
      [{ text: 'ЛСТК',           data: 'w:frame:lstk' }],
      [{ text: 'Металлокаркас',  data: 'w:frame:metal' }],
      [{ text: 'Модульный',      data: 'w:frame:modular' }],
    ] },
  cladding: { key: 'cladding', type: 'buttons', next: 'cladding_thk',
    prompt: '9/14  <b>Стены:</b>',
    buttons: [
      [{ text: 'Без стен', data: 'w:cladding:none' }, { text: 'Профлист', data: 'w:cladding:proflist' }],
      [{ text: 'Сэндвич минвата', data: 'w:cladding:sandwich_minvata' }],
      [{ text: 'Сэндвич PIR',     data: 'w:cladding:sandwich_pir' }],
    ] },
  cladding_thk: { key: 'cladding_thk', type: 'buttons', next: 'roofing',
    prompt: '10/14  <b>Толщина панели (мм):</b>',
    buttons: [
      [{ text: '50 мм',  data: 'w:cladding_thk:50' },  { text: '80 мм',  data: 'w:cladding_thk:80' }],
      [{ text: '100 мм', data: 'w:cladding_thk:100' }, { text: '120 мм', data: 'w:cladding_thk:120' }],
      [{ text: '150 мм (стандарт)', data: 'w:cladding_thk:150' }],
      [{ text: '200 мм (премиум утепление)', data: 'w:cladding_thk:200' }],
    ] },
  roofing: { key: 'roofing', type: 'buttons', next: 'foundation',
    prompt: '11/14  <b>Кровля:</b>',
    buttons: [
      [{ text: 'Профлист',      data: 'w:roofing:proflist' }],
      [{ text: 'Сэндвич (такая же толщина как стены)', data: 'w:roofing:sandwich' }],
    ] },
  foundation: { key: 'foundation', type: 'buttons', next: 'gates',
    prompt: '12/14  <b>Фундамент:</b>',
    buttons: [
      [{ text: 'Без фундамента',  data: 'w:foundation:none' }],
      [{ text: 'Свайно-винтовой', data: 'w:foundation:pile' }],
      [{ text: 'Ленточный',       data: 'w:foundation:strip' }],
      [{ text: 'Плита 200мм',     data: 'w:foundation:slab' }],
    ] },
  gates: { key: 'gates', type: 'optional_text', next: 'windows', optional: true,
    prompt: '13/14  <b>Ворота:</b>\nКоличество и размер. Примеры:\n• <code>1x4x4</code> — одни 4×4\n• <code>4x4 = 1, 3x3 = 2</code> — несколько\n• <code>нет</code>' },
  windows: { key: 'windows', type: 'optional_text', next: 'doors', optional: true,
    prompt: '<b>Окна:</b>\nПримеры:\n• <code>2x1500x2000</code> — два окна\n• <code>1500x2000 = 2, 1200x1500 = 3</code>\n• <code>нет</code>' },
  doors: { key: 'doors', type: 'optional_text', next: 'crane', optional: true,
    prompt: '14/15  <b>Двери:</b>\nПример: <code>2</code> или <code>нет</code>' },
  crane: { key: 'crane', type: 'buttons', next: 'notes',
    prompt: '15/15  <b>Мостовой кран внутри здания:</b>\nЕсли есть — нужны подкрановые балки, усиление колонн (+10-50% к каркасу)',
    buttons: [
      [{ text: 'Нет крана',         data: 'w:crane:0' }],
      [{ text: 'Кран-балка 1т',     data: 'w:crane:1' }, { text: 'Кран 3,2т', data: 'w:crane:3.2' }],
      [{ text: 'Кран 5т',           data: 'w:crane:5' }, { text: 'Кран 10т',  data: 'w:crane:10' }],
      [{ text: 'Больше 10т (инженер)', data: 'w:crane:20' }],
    ] },
  notes: { key: 'notes', type: 'optional_text', next: 'confirm', optional: true,
    prompt: '<b>Примечание</b> (необязательно):\nОсобые требования, сроки, контакты. Или <code>нет</code>.\n\n<i>⚠️ Логистика (доставка материалов) рассчитывается отдельно после согласования.</i>' },
  confirm: { key: 'confirm', type: 'buttons', next: 'done', prompt: '',
    buttons: [
      [{ text: '✅ Сделать КП',  data: 'w:confirm:yes' }],
      [{ text: '🔧 Поправить',   data: 'w:confirm:edit' }],
      [{ text: '❌ Отмена',      data: 'w:confirm:cancel' }],
    ] },
  done: { key: 'done', type: 'text', next: 'done', prompt: '' },
};

function formatSummary(c: Collected): string {
  const area = (c.length ?? 0) * (c.width ?? 0);
  const wallArea = 2 * ((c.length ?? 0) + (c.width ?? 0)) * (c.height ?? 0);
  const objLabel    = OBJECT_TYPES.find(x => x.id === c.object_type)?.label ?? c.object_type ?? '—';
  const frameLabel  = FRAMES.find(x => x.id === c.frame)?.label ?? c.frame ?? '—';
  const claddingLab = CLADDINGS.find(x => x.id === c.cladding)?.label ?? c.cladding ?? '—';
  const roofingLab  = ROOFINGS.find(x => x.id === c.roofing)?.label ?? c.roofing ?? '—';
  const fndLabel    = FOUNDATIONS.find(x => x.id === c.foundation)?.label ?? c.foundation ?? '—';
  const regionLabel = REGIONS_BOT[c.region ?? 'krsk_city'] ?? 'Красноярск';
  const fmtItems = (items?: { size: string; count: number }[]) =>
    items && items.length ? items.map(i => `${i.count} × ${i.size}`).join(', ') : 'нет';
  const fmtRub = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
  const { lines, total, low, high, complexity, flags } = calcEstimate(c);
  const thkSuffix = c.cladding_thk ? ` ${c.cladding_thk}мм` : '';
  let msg = `<b>📋 РЕЗЮМЕ КП</b>\n\n`;
  msg += `<b>Клиент:</b> ${c.client_name ?? '—'}\n`;
  msg += `<b>Телефон:</b> <code>${c.phone ?? '—'}</code>\n`;
  msg += `<b>Регион:</b> ${regionLabel}\n\n`;
  msg += `<b>Объект:</b> ${objLabel} ${c.length}×${c.width}×${c.height} м (${area} м²)\n`;
  msg += `<b>Каркас:</b> ${frameLabel}\n`;
  msg += `<b>Стены:</b> ${claddingLab}${thkSuffix} (${wallArea.toFixed(0)} м²)\n`;
  msg += `<b>Кровля:</b> ${roofingLab}${thkSuffix}\n`;
  msg += `<b>Фундамент:</b> ${fndLabel}\n\n`;
  msg += `<b>Доборные:</b>\n`;
  msg += `• Ворота: ${fmtItems(c.gates)}\n`;
  msg += `• Окна: ${fmtItems(c.windows)}\n`;
  msg += `• Двери: ${c.doors?.count ? c.doors.count + ' шт' : 'нет'}\n`;
  if ((c.crane_t ?? 0) > 0) {
    msg += `• <b>Мостовой кран:</b> ${c.crane_t}т\n`;
  }
  if (c.notes) msg += `\n<i>Примечание: ${c.notes}</i>\n`;
  // Если кран >10т — требуется индивидуальный расчёт инженера
  if ((c.crane_t ?? 0) >= 20) {
    msg += `\n🔴 <b>ВНИМАНИЕ:</b> Кран >10т требует индивидуального инженерного расчёта.\nКП будет персональным после согласования с инженером.\n`;
  }
  msg += `\n<b>📊 СМЕТА (engine v3, тот же расчёт что на сайте)</b>\n`;
  for (const line of lines) msg += `${line.label}: <code>${fmtRub(line.value)}</code>\n`;
  msg += `\n<b>ИТОГО:</b> <b>${fmtRub(total)}</b>\n`;
  msg += `<i>Диапазон: ${fmtRub(low)} — ${fmtRub(high)}</i>\n`;
  if (complexity === 'ENGINEER_REQUIRED') {
    msg += `\n🔴 <b>ИНЖЕНЕРНАЯ ПРОВЕРКА.</b> Флаги: ${flags.join(', ')}.\n`;
    msg += `Цифры выше — ориентир. Финальное КП — после расчёта инженера.\n`;
  } else if (complexity === 'EXTENDED') {
    msg += `\n🟡 <i>Расширенный объект (флаги: ${flags.join(', ')}). Цена ориентировочная.</i>\n`;
  }
  msg += `\n<i>⚠️ Логистика рассчитывается отдельно после согласования.</i>\n`;
  msg += `<i>Версия каталога: ${CATALOG_VERSION}</i>\n`;
  return msg;
}

// ════════════════════════════════════════════════════════════════
// ──── Конец inlined wizard ────
// ════════════════════════════════════════════════════════════════


const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET   = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const ADMIN_CHAT_IDS = (Deno.env.get("ADMIN_CHAT_IDS") ?? Deno.env.get("ALLOWED_CHAT_IDS") ?? "")
  .split(",")
  .map((x) => Number(x.trim()))
  .filter(Boolean);
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RUNTIME_ENV = (Deno.env.get("ENVIRONMENT") ?? Deno.env.get("DENO_ENV") ?? "production").toLowerCase();
const IS_PRODUCTION = RUNTIME_ENV !== "development" && RUNTIME_ENV !== "local";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─────────────────────────── helpers ───────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new:       "🆕 Новая",
  contacted: "🟡 В работе",
  kp_sent:   "📄 КП отправлено",
  won:       "✅ Договор",
  lost:      "❌ Отказ",
};

const SOURCE_LABEL: Record<string, string> = {
  contact:  "💬 Контактная форма",
  project:  "📐 Готовый проект",
  partner:  "🤝 Партнёрство",
  estimate: "🧮 Мастер расчёта",
  kp_bot:   "🤖 КП из Telegram",
};

function leadButtons(leadId: string) {
  return {
    inline_keyboard: [
      [
        { text: "🟡 Взял в работу", callback_data: `s:contacted:${leadId}` },
        { text: "📄 Отправил КП",   callback_data: `s:kp_sent:${leadId}` },
      ],
      [
        { text: "✅ Договор",        callback_data: `s:won:${leadId}` },
        { text: "❌ Отказ",          callback_data: `s:lost:${leadId}` },
      ],
    ],
  };
}

function isAdminChat(chatId: number) {
  return ADMIN_CHAT_IDS.includes(chatId);
}

function configErrors(): string[] {
  const errors: string[] = [];
  if (!BOT_TOKEN) errors.push("TELEGRAM_BOT_TOKEN is missing");
  if (!SUPABASE_URL) errors.push("SUPABASE_URL is missing");
  if (!SERVICE_KEY) errors.push("SUPABASE_SERVICE_ROLE_KEY is missing");
  if (IS_PRODUCTION && !WEBHOOK_SECRET) errors.push("TELEGRAM_WEBHOOK_SECRET is required in production");
  return errors;
}

async function tg(method: string, payload: Record<string, unknown>) {
  const r = await fetch(`${TG_API}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return r.json();
}

const sendMessage = (chat_id: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

const answerCallback = (callback_query_id: string, text?: string) =>
  tg("answerCallbackQuery", { callback_query_id, text: text ?? "", show_alert: false });

const editMessageText = (
  chat_id: number | string,
  message_id: number,
  text: string,
  reply_markup?: Record<string, unknown>,
) => tg("editMessageText", {
  chat_id,
  message_id,
  text,
  parse_mode: "HTML",
  disable_web_page_preview: true,
  ...(reply_markup ? { reply_markup } : {}),
});

function fmtRub(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("ru-RU", { timeZone: "Asia/Krasnoyarsk", dateStyle: "short", timeStyle: "short" });
}

function formatLeadCard(lead: any) {
  const status = STATUS_LABEL[lead.status] || lead.status;
  const source = SOURCE_LABEL[lead.source] || lead.source;
  const est = lead.estimate as any;
  let msg = `<b>${source}</b>  ·  ${status}\n\n`;
  msg += `<b>Имя:</b> ${lead.name ?? "—"}\n`;
  msg += `<b>Телефон:</b> <code>${lead.phone ?? "—"}</code>`;
  if (lead.email)       msg += `\n<b>Email:</b> ${lead.email}`;
  if (lead.client_type) msg += `\n<b>Тип:</b> ${lead.client_type}`;
  if (lead.company)     msg += `\n<b>Компания:</b> ${lead.company}`;
  if (lead.direction)   msg += `\n<b>Направление:</b> ${lead.direction}`;
  if (lead.object_type) msg += `\n<b>Объект:</b> ${lead.object_type}`;
  if (lead.message)     msg += `\n\n<i>${lead.message}</i>`;

  if (est?.low != null && est?.high != null) {
    msg += `\n\n<b>Оценка:</b> ${fmtRub(est.low)} — ${fmtRub(est.high)}`;
  }
  if (est?.state) {
    const s = est.state;
    if (s.length && s.width) {
      msg += `\n<b>Размеры:</b> ${s.length}×${s.width}×${s.height ?? "?"} м`;
    }
  }
  if (Array.isArray(lead.files) && lead.files.length > 0) {
    msg += `\n<b>Файлов:</b> ${lead.files.length}`;
  }
  msg += `\n\n<code>${lead.id}</code>  ·  <i>${fmtDate(lead.created_at)}</i>`;
  return msg;
}

// ─────────────────────────── handlers ───────────────────────────

async function handleCallback(cb: any) {
  const chatId = cb.message.chat.id;
  const msgId  = cb.message.message_id;
  const data = cb.data as string;

  // Wizard callbacks (w:field:value)
  if (data.startsWith("w:")) {
    await handleWizardCallback(cb);
    return;
  }

  if (!isAdminChat(chatId)) {
    await answerCallback(cb.id, "🚫 Это действие доступно только администратору");
    return;
  }

  // Status change callbacks (s:status:leadId)
  const [, newStatus, leadId] = data.split(":");
  if (!newStatus || !leadId) {
    await answerCallback(cb.id, "Не могу разобрать кнопку");
    return;
  }

  const { error: upErr } = await supabase
    .from("leads")
    .update({ status: newStatus })
    .eq("id", leadId);

  if (upErr) {
    await answerCallback(cb.id, `Ошибка: ${upErr.message}`);
    return;
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (lead) {
    await editMessageText(chatId, msgId, formatLeadCard(lead), leadButtons(leadId));
  }
  await answerCallback(cb.id, `Статус: ${STATUS_LABEL[newStatus] ?? newStatus}`);
}

async function sendPublicHelp(chatId: number) {
  await sendMessage(chatId,
    `<b>АЗИМЕР — анкета для расчёта здания</b>\n\n` +
    `Я помогу собрать параметры объекта и подготовить предварительное КП.\n\n` +
    `<code>/kp_new</code> — начать анкету\n` +
    `<code>/cancel</code> — отменить текущую анкету\n\n` +
    `После отправки анкеты менеджер АЗИМЕР проверит данные и свяжется с вами.`
  );
}

async function handleCommand(msg: any) {
  const chatId = msg.chat.id;
  let [cmd, ...args] = (msg.text as string).split(/\s+/);

  // Алиасы для меню BotFather (без пробелов)
  const aliases: Record<string, [string, string[]]> = {
    "/leadsnew":        ["/leads", ["new"]],
    "/leadscontacted":  ["/leads", ["contacted"]],
    "/leadskpsent":     ["/leads", ["kp_sent"]],
    "/leadswon":        ["/leads", ["won"]],
    "/leadslost":       ["/leads", ["lost"]],
    "/leadstoday":      ["/leads", ["today"]],
    "/leadsweek":       ["/leads", ["week"]],
    "/leadsmonth":      ["/leads", ["month"]],
    "/kpnew":           ["/kp_new", []],
    "/eadskpsent":      ["/leads", ["kp_sent"]],
  };
  // Убираем @botname из команды (Telegram добавляет в групповых чатах)
  cmd = cmd.split("@")[0];
  if (aliases[cmd]) {
    [cmd, args] = aliases[cmd];
  }

  const isAdmin = isAdminChat(chatId);
  const adminCommands = new Set(["/leads", "/find", "/stats", "/kp"]);

  if (!isAdmin && (cmd === "/start" || cmd === "/help")) {
    await sendPublicHelp(chatId);
    return;
  }

  if (cmd === "/kp_new") {
    await startWizard(chatId);
    return;
  }

  if (cmd === "/cancel") {
    const cancelled = await cancelWizard(chatId);
    await sendMessage(chatId,
      cancelled
        ? "❌ Сессия КП отменена."
        : "У тебя нет активной сессии. /kp_new — начать новую."
    );
    return;
  }

  if (!isAdmin) {
    await sendMessage(chatId,
      adminCommands.has(cmd)
        ? `🚫 Эта команда доступна только администратору. Для анкеты используй <code>/kp_new</code>.`
        : `Команда <code>${cmd}</code> неизвестна. Для анкеты используй <code>/kp_new</code>.`
    );
    return;
  }

  if (cmd === "/start" || cmd === "/help") {
    await sendMessage(chatId,
      `<b>🤖 Бот АЗИМЕР — инструкция</b>\n\n` +
      `Бот ловит заявки с сайта и помогает вести их по воронке.\n\n` +
      `<b>📋 Списки заявок:</b>\n` +
      `<code>/leads</code> — последние 10 заявок\n` +
      `<code>/leadsnew</code> — только новые (не взятые в работу)\n` +
      `<code>/leadscontacted</code> — в работе (взял, но КП ещё не отправил)\n` +
      `<code>/leadskpsent</code> — КП отправлено, ждём решения клиента\n` +
      `<code>/leadswon</code> — закрытые в плюс (договоры)\n` +
      `<code>/leadslost</code> — отказы\n\n` +
      `<b>📅 По датам:</b>\n` +
      `<code>/leadstoday</code> — сегодня\n` +
      `<code>/leadsweek</code> — последние 7 дней\n` +
      `<code>/leadsmonth</code> — последние 30 дней\n\n` +
      `<b>🔍 Поиск:</b>\n` +
      `<code>/find Иванов</code> — по имени, телефону, компании, объекту\n` +
      `<code>/find +79991</code> — по номеру телефона\n\n` +
      `<b>📊 Аналитика:</b>\n` +
      `<code>/stats</code> — статистика за 30 дней (всего заявок, по статусам, по источникам)\n\n` +
      `<b>🧮 Генерация КП:</b>\n` +
      `<code>/kp_new</code> — собрать КП по новому объекту через 14 вопросов с кнопками\n` +
      `<code>/cancel</code> — отменить активную сессию КП\n\n` +
      `<b>🎯 Как работать со статусами:</b>\n` +
      `Под каждой карточкой 4 кнопки — нажимай как только меняется этап:\n` +
      `🟡 <b>Взял в работу</b> — позвонил, начал общение\n` +
      `📄 <b>Отправил КП</b> — клиент получил коммерческое\n` +
      `✅ <b>Договор</b> — сделка состоялась\n` +
      `❌ <b>Отказ</b> — клиент отказался / не отвечает\n\n` +
      `<b>💡 Совет:</b> утром жми <code>/leadsnew</code>, вечером — <code>/stats</code>.\n` +
      `Каждой новой заявке сразу жми 🟡 чтоб не забыть позвонить.`
    );
    return;
  }

  if (cmd === "/leads") {
    const filter = args[0];
    let q = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // Фильтры по статусу
    if (filter && STATUS_LABEL[filter]) {
      q = q.eq("status", filter);
    }
    // Фильтры по дате
    else if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      q = q.gte("created_at", today.toISOString()).limit(50);
    } else if (filter === "week") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since).limit(50);
    } else if (filter === "month") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since).limit(50);
    }

    const { data, error } = await q;
    if (error) {
      await sendMessage(chatId, `Ошибка: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await sendMessage(chatId, "Заявок не найдено.");
      return;
    }
    if (data.length > 10) {
      await sendMessage(chatId, `<b>Найдено ${data.length} заявок</b> — показываю по очереди.`);
    }
    for (const lead of data) {
      await sendMessage(chatId, formatLeadCard(lead), { reply_markup: leadButtons(lead.id) });
    }
    return;
  }

  if (cmd === "/find") {
    const query = args.join(" ").trim();
    if (!query) {
      await sendMessage(chatId, "Использование: <code>/find Иванов</code> или <code>/find +7999</code>");
      return;
    }
    const q = `%${query.replace(/[%_]/g, "\\$&")}%`;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .or(`name.ilike.${q},phone.ilike.${q},company.ilike.${q},object_type.ilike.${q},email.ilike.${q}`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      await sendMessage(chatId, `Ошибка поиска: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await sendMessage(chatId, `По запросу <b>${query}</b> ничего не найдено.`);
      return;
    }
    await sendMessage(chatId, `<b>Найдено ${data.length} заявок</b> по запросу <i>${query}</i>:`);
    for (const lead of data) {
      await sendMessage(chatId, formatLeadCard(lead), { reply_markup: leadButtons(lead.id) });
    }
    return;
  }

  if (cmd === "/stats") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("leads")
      .select("status, source")
      .gte("created_at", since);
    if (error) {
      await sendMessage(chatId, `Ошибка: ${error.message}`);
      return;
    }
    const total = data?.length ?? 0;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const l of data ?? []) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
      bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    }
    let txt = `<b>📊 Статистика за 30 дней</b>\n\n`;
    txt += `Всего заявок: <b>${total}</b>\n\n`;
    txt += `<b>По статусам:</b>\n`;
    for (const [k, v] of Object.entries(byStatus)) {
      txt += `• ${STATUS_LABEL[k] ?? k}: ${v}\n`;
    }
    txt += `\n<b>По источникам:</b>\n`;
    for (const [k, v] of Object.entries(bySource)) {
      txt += `• ${SOURCE_LABEL[k] ?? k}: ${v}\n`;
    }
    await sendMessage(chatId, txt);
    return;
  }

  // /kp оставлен как скрытая команда — для поиска заявки по точному ID
  // (полезно когда обсуждаешь заявку в другом канале). В меню BotFather не выносим.
  if (cmd === "/kp") {
    const leadId = args[0];
    if (!leadId) {
      await sendMessage(chatId,
        "Использование: <code>/kp &lt;id заявки&gt;</code>\n" +
        "ID видно под каждой карточкой. Проще искать через <code>/find</code> или <code>/leads</code>."
      );
      return;
    }
    const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (error || !data) {
      await sendMessage(chatId, `Заявка <code>${leadId}</code> не найдена.`);
      return;
    }
    await sendMessage(chatId, formatLeadCard(data), { reply_markup: leadButtons(data.id) });
    return;
  }

  await sendMessage(chatId, `Команда <code>${cmd}</code> неизвестна. /help — полная инструкция.`);
}

// ─────────────────────────── entry ───────────────────────────

Deno.serve(async (req) => {
  const errors = configErrors();
  if (errors.length > 0) {
    console.error("telegram-bot configuration error:", errors.join("; "));
    return new Response("configuration error: " + errors.join("; "), { status: 503 });
  }

  // Защита от не-Telegram запросов через secret_token (Telegram добавляет этот заголовок)
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: any;
  try { update = await req.json(); }
  catch { return new Response("bad request", { status: 400 }); }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message?.text) {
      const text = update.message.text as string;
      // Если есть активная wizard-сессия и это НЕ команда — пускаем в wizard
      if (!text.startsWith("/")) {
        const chatId = update.message.chat.id;
        const handled = await handleWizardText(chatId, text);
        if (!handled) {
          // Свободное сообщение без активной сессии — игнорируем (пока)
        }
      } else {
        await handleCommand(update.message);
      }
    }
  } catch (e) {
    console.error("bot error:", e);
  }

  return new Response("ok");
});

// ═══════════════════════════════════════════════════════════════
// WIZARD — пошаговый сбор параметров КП и генерация заявки
// ═══════════════════════════════════════════════════════════════

async function getActiveSession(chatId: number) {
  const { data } = await supabase
    .from("kp_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .in("status", ["collecting", "confirming"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any | null;
}

async function startWizard(chatId: number) {
  // Если есть активная — спросить
  const existing = await getActiveSession(chatId);
  if (existing) {
    await sendMessage(chatId,
      `У тебя уже есть незавершённая сессия (шаг: <code>${existing.current_step}</code>).\n` +
      `Чтобы продолжить — просто ответь на последний вопрос.\n` +
      `Чтобы отменить — <code>/cancel</code> и потом снова <code>/kp_new</code>.`
    );
    return;
  }

  const { data, error } = await supabase
    .from("kp_sessions")
    .insert({ chat_id: chatId, current_step: "client_name", collected: {} })
    .select("*")
    .single();

  if (error || !data) {
    await sendMessage(chatId, `Ошибка создания сессии: ${error?.message ?? "?"}`);
    return;
  }

  await sendMessage(chatId,
    `<b>🧮 Новая сессия КП</b>\n\n` +
    `Соберём 14 параметров с кнопками и короткими ответами. ` +
    `Если ошибся — пиши <code>/cancel</code> и начинай заново.\n\n` +
    `<i>Сессия живёт 24 часа.</i>`
  );

  await askStep(chatId, "client_name", data.id);
}

async function cancelWizard(chatId: number): Promise<boolean> {
  const session = await getActiveSession(chatId);
  if (!session) return false;
  await supabase.from("kp_sessions").update({ status: "cancelled" }).eq("id", session.id);
  return true;
}

async function askStep(chatId: number, stepKey: StepKey, sessionId: string) {
  const step = STEPS[stepKey];
  const replyMarkup = step.buttons ? { inline_keyboard: step.buttons.map(row => row.map(b => ({ text: b.text, callback_data: b.data }))) } : undefined;
  const sent: any = await sendMessage(chatId, step.prompt, replyMarkup ? { reply_markup: replyMarkup } : {});
  // Сохраняем message_id вопроса (для возможного редактирования)
  if (sent?.result?.message_id) {
    await supabase.from("kp_sessions")
      .update({
        current_step: stepKey,
        last_question_message_id: sent.result.message_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }
}

async function saveAndAdvance(chatId: number, session: any, fieldKey: string, value: any, nextStep: StepKey) {
  const collected = { ...(session.collected ?? {}), [fieldKey]: value };
  if (nextStep === "confirm") {
    await supabase.from("kp_sessions")
      .update({ collected, current_step: "confirm", status: "confirming", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    await showConfirmation(chatId, session.id, collected);
    return;
  }
  await supabase.from("kp_sessions")
    .update({ collected, current_step: nextStep, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  await askStep(chatId, nextStep, session.id);
}

async function showConfirmation(chatId: number, sessionId: string, collected: Collected) {
  const summary = formatSummary(collected);
  const buttons = STEPS.confirm.buttons!.map(row => row.map(b => ({ text: b.text, callback_data: b.data })));
  await sendMessage(chatId, summary + `\n<i>Подтверди — и создам заявку + ссылку на КП.</i>`, {
    reply_markup: { inline_keyboard: buttons },
  });
}

async function handleWizardText(chatId: number, text: string): Promise<boolean> {
  const session = await getActiveSession(chatId);
  if (!session) return false;

  const stepKey = session.current_step as StepKey;
  const step = STEPS[stepKey];
  if (!step) return false;

  const tNorm = text.trim();
  const collected = session.collected as Collected;

  // text / numeric / optional_text
  switch (stepKey) {
    case "client_name": {
      if (tNorm.length < 2) {
        await sendMessage(chatId, "Слишком короткое имя. Попробуй ещё раз.");
        return true;
      }
      await saveAndAdvance(chatId, session, "client_name", tNorm, "phone");
      return true;
    }
    case "phone": {
      const p = parsePhone(tNorm);
      if (!p) {
        await sendMessage(chatId, "Не похоже на телефон. Пример: <code>+79991234567</code>");
        return true;
      }
      await saveAndAdvance(chatId, session, "phone", p, "region");
      return true;
    }
    case "length":
    case "width":
    case "height": {
      const n = parseDimension(tNorm);
      if (!n) {
        await sendMessage(chatId, "Не понял число. Просто метраж, например: <code>18</code>");
        return true;
      }
      const next = stepKey === "length" ? "width" : stepKey === "width" ? "height" : "frame";
      await saveAndAdvance(chatId, session, stepKey, n, next);
      return true;
    }
    case "gates":
    case "windows": {
      const items = parseItems(tNorm);
      if (items === null) {
        await sendMessage(chatId, "Не разобрал. Пример: <code>1x4x4</code> или <code>нет</code>");
        return true;
      }
      const next = stepKey === "gates" ? "windows" : "doors";
      await saveAndAdvance(chatId, session, stepKey, items, next);
      return true;
    }
    case "doors": {
      let count = 0;
      const low = tNorm.toLowerCase();
      if (low === "нет" || low === "не нужно" || low === "-") count = 0;
      else {
        const n = parseInt0(tNorm);
        if (n === null) {
          await sendMessage(chatId, "Сколько дверей? Пример: <code>2</code> или <code>нет</code>");
          return true;
        }
        count = n;
      }
      await saveAndAdvance(chatId, session, "doors", { count }, "notes");
      return true;
    }
    case "notes": {
      const low = tNorm.toLowerCase();
      const value = (low === "нет" || low === "-") ? undefined : tNorm;
      await saveAndAdvance(chatId, session, "notes", value, "confirm");
      return true;
    }
    case "region":
    case "object_type":
    case "frame":
    case "cladding":
    case "cladding_thk":
    case "roofing":
    case "foundation":
    case "crane":
    case "confirm":
      await sendMessage(chatId, "Здесь нужно нажать кнопку выше ↑");
      return true;
  }
  return true;
}

async function handleWizardCallback(cb: any) {
  const chatId = cb.message.chat.id;
  const data = cb.data as string;
  const [, field, value] = data.split(":");

  const session = await getActiveSession(chatId);
  if (!session) {
    await answerCallback(cb.id, "Сессия истекла. /kp_new — начать новую.");
    return;
  }

  // Подтверждение
  if (field === "confirm") {
    if (value === "cancel") {
      await supabase.from("kp_sessions").update({ status: "cancelled" }).eq("id", session.id);
      await answerCallback(cb.id, "Отменено");
      await sendMessage(chatId, "❌ КП отменено. /kp_new — начать заново.");
      return;
    }
    if (value === "edit") {
      await answerCallback(cb.id, "Какой шаг править?");
      // Простой вариант: предлагаем начать заново
      await sendMessage(chatId,
        "Чтобы исправить — отмени и начни заново: <code>/cancel</code> → <code>/kp_new</code>.\n" +
        "<i>В следующей версии добавим точечную правку каждого шага.</i>"
      );
      return;
    }
    if (value === "yes") {
      await answerCallback(cb.id, "Создаю КП...");
      await finalizeKpAndCreateLead(chatId, session);
      return;
    }
  }

  // Толщина сэндвича — числовое значение
  if (field === "cladding_thk") {
    const thk = parseInt(value, 10);
    if (isNaN(thk)) {
      await answerCallback(cb.id, "Не понял толщину");
      return;
    }
    await answerCallback(cb.id, `${thk} мм`);
    await saveAndAdvance(chatId, session, "cladding_thk", thk, "roofing");
    return;
  }

  // Грузоподъёмность крана — число с дробной частью
  if (field === "crane") {
    const t = parseFloat(value);
    if (isNaN(t)) {
      await answerCallback(cb.id, "Не понял");
      return;
    }
    const label = t === 0 ? "Без крана" : `Кран ${t}т`;
    await answerCallback(cb.id, label);
    await saveAndAdvance(chatId, session, "crane_t", t, "notes");
    return;
  }

  // Обычные buttons-поля (object_type / region / frame / cladding / roofing / foundation)
  const stepKey = session.current_step as StepKey;
  const step = STEPS[stepKey];
  if (!step || step.type !== "buttons") {
    await answerCallback(cb.id, "Не тот шаг");
    return;
  }

  await answerCallback(cb.id, value);
  await saveAndAdvance(chatId, session, field, value, step.next);
}

async function finalizeKpAndCreateLead(chatId: number, session: any) {
  const c = session.collected as Collected;
  const estimate = calcEstimate(c);

  // Собираем estimate-объект как с сайта
  const estimateData = {
    state: {
      objectType: c.object_type,
      region: c.region,
      frame: c.frame,
      length: c.length,
      width:  c.width,
      height: c.height,
      cladding:   c.cladding,
      claddingThk: c.cladding_thk,
      roofing:    c.roofing,
      foundation: c.foundation,
      options: {
        gate:   c.gates?.reduce((a, g) => a + g.count, 0) ?? 0,
        window: c.windows?.reduce((a, w) => a + w.count, 0) ?? 0,
        door:   c.doors?.count ?? 0,
      },
    },
    area:     (c.length ?? 0) * (c.width ?? 0),
    wallArea: 2 * ((c.length ?? 0) + (c.width ?? 0)) * (c.height ?? 0),
    lines:    estimate.lines,
    base:     estimate.total,
    low:      estimate.low,
    high:     estimate.high,
    catalogVersion: CATALOG_VERSION,
    kpMode: "current-recalc",
  };

  const noteParts: string[] = [];
  if (c.notes) noteParts.push(c.notes);
  noteParts.push("Логистика: рассчитывается отдельно по запросу");

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      source:      "kp_bot",
      status:      "kp_sent",
      name:        c.client_name,
      phone:       c.phone,
      object_type: c.object_type,
      message:     noteParts.join("\n") || null,
      estimate:    estimateData,
      catalog_version: CATALOG_VERSION,
    })
    .select("id")
    .single();

  if (error || !lead) {
    await sendMessage(chatId, `❌ Ошибка создания заявки: ${error?.message ?? "?"}`);
    return;
  }

  await supabase.from("kp_sessions")
    .update({ status: "done", created_lead_id: lead.id, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  // Строим ссылку на детальный КП на сайте — все параметры в URL hash
  const kpUrl = buildKpUrl(c, lead.id);

  await sendMessage(chatId,
    `✅ <b>КП готово!</b>\n\n` +
    formatSummary(c) +
    `\n\n📎 <b>Открыть детальный КП (для распечатки/PDF):</b>\n${kpUrl}\n\n` +
    `Заявка в БД: <code>${lead.id}</code>\n` +
    `Статус: 📄 КП отправлено (нажми ✅ Договор когда подпишете).`,
    { disable_web_page_preview: true }
  );
}

// Мапим bot Collected → engine BuildingInput
function mapCollectedToInput(c: Collected): any {
  // mapping cladding (bot: "sandwich_minvata" | "sandwich_pir" | "proflist" | "none")
  // Defaults thickness 150мм для сэндвича.
  const cladding = c.cladding ?? "none";
  const roofing  = c.roofing  ?? "proflist";

  // bot's roofing="sandwich" → engine "sandwich_minvata" по умолчанию
  const roofingMapped = roofing === "sandwich" ? "sandwich_minvata" : roofing;

  // bot's foundation: "pile" → "pile_screw"
  const foundationMap: Record<string, string> = {
    pile:  "pile_screw",
    strip: "strip",
    slab:  "slab_200",
    none:  "none",
  };
  const foundation = foundationMap[c.foundation ?? "none"] ?? "none";

  // bot's object_type — некоторые объекты добавляем
  const thk = c.cladding_thk;
  return {
    region:     c.region ?? "krsk_city",
    objectType: c.object_type ?? "sklad",
    length:     c.length ?? 0,
    width:      c.width  ?? 0,
    height:     c.height ?? 0,
    frame:      c.frame ?? "metal",
    cladding,
    claddingThk: cladding.startsWith("sandwich") ? (thk ?? 150) : undefined,
    roofing:    roofingMapped,
    roofingThk: roofingMapped.startsWith("sandwich") ? (thk ?? 150) : undefined,
    foundation,
    gates:      c.gates ?? [],
    windows:    c.windows ?? [],
    doors:      { count: c.doors?.count ?? 0 },
    craneCapacityT: c.crane_t ?? 0,
    notes:      c.notes,
  };
}

function buildKpUrl(c: Collected, leadId: string): string {
  const input = mapCollectedToInput(c);
  const payload = {
    input,
    client: { name: c.client_name, phone: c.phone },
    leadId,
    catalogVersion: CATALOG_VERSION,
    issuedAt: new Date().toISOString(),
    mode: "current-recalc",
  };
  const json = JSON.stringify(payload);
  // Base64 UTF-8 (TextEncoder универсально работает в Deno)
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const base64 = btoa(bin);
  return `${SITE_URL}/kp#data=${encodeURIComponent(base64)}`;
}
