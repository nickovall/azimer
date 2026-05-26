// АЗИМЕР — Wizard для сбора параметров КП через бота.
// Используется внутри основной Edge Function telegram-bot/index.ts.
//
// deno-lint-ignore-file no-explicit-any

// ─────────────────────────── Типы и константы ───────────────────────────

export type StepKey =
  | 'client_name' | 'phone' | 'object_type'
  | 'length' | 'width' | 'height'
  | 'frame' | 'cladding' | 'roofing' | 'foundation'
  | 'gates' | 'windows' | 'doors'
  | 'logistics_choice' | 'logistics_dest'
  | 'notes'
  | 'confirm'
  | 'done';

export interface Collected {
  client_name?: string;
  phone?:       string;
  object_type?: string;       // sklad / angar / production / commercial / naves / modular / other
  length?:      number;
  width?:       number;
  height?:      number;
  frame?:       string;       // lstk / metal / modular
  cladding?:    string;       // none / proflist / sandwich_minvata / sandwich_pir
  roofing?:     string;       // proflist / sandwich
  foundation?:  string;       // none / pile / strip / slab
  gates?:       { size: string; count: number }[];
  windows?:     { size: string; count: number }[];
  doors?:       { count: number; note?: string };
  logistics_add?:    boolean;
  logistics_dest?:   string;  // krasnoyarsk / hakasia / kemerovo / irkutsk / altai / other
  logistics_amount?: number;  // итоговая сумма доставки
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

const FRAMES = [
  { id: 'lstk',    label: 'ЛСТК',         rate: 10500 },
  { id: 'metal',   label: 'Металлокаркас', rate: 13000 },
  { id: 'modular', label: 'Модульный',     rate: 38000 },
];

const CLADDINGS = [
  { id: 'none',             label: 'Без стен',         rate: 0 },
  { id: 'proflist',         label: 'Профлист',         rate: 850 },
  { id: 'sandwich_minvata', label: 'Сэндвич минвата 150', rate: 3900 },
  { id: 'sandwich_pir',     label: 'Сэндвич PIR 150',  rate: 4600 },
];

const ROOFINGS = [
  { id: 'proflist', label: 'Профлист',        rate: 950 },
  { id: 'sandwich', label: 'Сэндвич 150мм',   rate: 4100 },
];

const FOUNDATIONS = [
  { id: 'none',  label: 'Без фундамента',   rate: 0 },
  { id: 'pile',  label: 'Свайно-винтовой',  rate: 3050 },
  { id: 'strip', label: 'Ленточный',        rate: 4500 },
  { id: 'slab',  label: 'Плита 200мм',      rate: 6500 },
];

const LOGISTICS = [
  { id: 'krasnoyarsk', label: 'Красноярск',          amount: 0      },
  { id: 'hakasia',     label: 'Хакасия (Абакан)',    amount: 200000 },
  { id: 'kemerovo',    label: 'Кемерово',            amount: 250000 },
  { id: 'irkutsk',     label: 'Иркутск',             amount: 350000 },
  { id: 'altai',       label: 'Алтай (Барнаул)',     amount: 280000 },
  { id: 'other',       label: 'Другое направление',  amount: 0      },
];

const GATE_PRICE   = 180000;  // секционные 4×4 средняя цена
const WINDOW_PRICE = 22000;
const DOOR_PRICE   = 18000;

// ─────────────────────────── Расчёт сметы ───────────────────────────

export function calcEstimate(c: Collected): { lines: { label: string; value: number }[]; total: number; low: number; high: number } {
  const lines: { label: string; value: number }[] = [];

  const area = (c.length ?? 0) * (c.width ?? 0);
  const wallArea = 2 * ((c.length ?? 0) + (c.width ?? 0)) * (c.height ?? 0);

  // Каркас
  const frame = FRAMES.find(f => f.id === c.frame);
  if (frame && area > 0) {
    lines.push({ label: `Каркас (${frame.label})`, value: area * frame.rate });
  }

  // Стены
  const cladding = CLADDINGS.find(x => x.id === c.cladding);
  if (cladding && cladding.rate > 0 && wallArea > 0 && c.frame !== 'modular') {
    lines.push({ label: `Стены (${cladding.label})`, value: wallArea * cladding.rate });
  }

  // Кровля
  const roofing = ROOFINGS.find(x => x.id === c.roofing);
  if (roofing && roofing.rate > 0 && area > 0 && c.frame !== 'modular') {
    lines.push({ label: `Кровля (${roofing.label})`, value: area * roofing.rate });
  }

  // Фундамент
  const fnd = FOUNDATIONS.find(x => x.id === c.foundation);
  if (fnd && fnd.rate > 0 && area > 0) {
    lines.push({ label: `Фундамент (${fnd.label})`, value: area * fnd.rate });
  }

  // Доборные
  const gatesCount = c.gates?.reduce((a, g) => a + g.count, 0) ?? 0;
  if (gatesCount > 0) lines.push({ label: `Ворота (${gatesCount} шт)`, value: gatesCount * GATE_PRICE });

  const winCount = c.windows?.reduce((a, w) => a + w.count, 0) ?? 0;
  if (winCount > 0) lines.push({ label: `Окна (${winCount} шт)`, value: winCount * WINDOW_PRICE });

  const doorCount = c.doors?.count ?? 0;
  if (doorCount > 0) lines.push({ label: `Двери (${doorCount} шт)`, value: doorCount * DOOR_PRICE });

  // Логистика
  if (c.logistics_add && (c.logistics_amount ?? 0) > 0) {
    const dest = LOGISTICS.find(l => l.id === c.logistics_dest)?.label ?? 'доставка';
    lines.push({ label: `Логистика (${dest})`, value: c.logistics_amount! });
  }

  const total = lines.reduce((sum, l) => sum + l.value, 0);
  const low   = Math.round((total * 0.9)  / 1000) * 1000;
  const high  = Math.round((total * 1.15) / 1000) * 1000;

  return { lines, total, low, high };
}

// ─────────────────────────── Парсеры ──────────────────────────

export function parsePhone(s: string): string | null {
  const digits = s.replace(/\D/g, '');
  if (digits.length === 11) return '+' + (digits[0] === '8' ? '7' + digits.slice(1) : digits);
  if (digits.length === 10) return '+7' + digits;
  return null;
}

export function parseDimension(s: string): number | null {
  const cleaned = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0 || n > 200) return null;
  return n;
}

export function parseInt0(s: string): number | null {
  const n = parseInt(s.trim(), 10);
  if (isNaN(n) || n < 0) return null;
  return n;
}

/**
 * Парсит описание ворот / окон в формате:
 *   "1x4x4"        → [{size:"4x4", count:1}]
 *   "2x1500x2000"  → [{size:"1500x2000", count:2}]
 *   "2"            → [{size:"стандарт", count:2}]
 *   "4x4 = 1, 3x3 = 2" → [{size:"4x4", count:1}, {size:"3x3", count:2}]
 */
export function parseItems(s: string): { size: string; count: number }[] | null {
  const trimmed = s.trim().toLowerCase();
  if (trimmed === 'нет' || trimmed === 'не нужно' || trimmed === 'не нужны' || trimmed === '-') return [];

  const result: { size: string; count: number }[] = [];

  // Формат "размер = кол-во, размер = кол-во"
  if (trimmed.includes('=')) {
    for (const part of trimmed.split(',')) {
      const [size, countStr] = part.split('=').map(x => x.trim());
      const count = parseInt(countStr, 10);
      if (size && !isNaN(count) && count > 0) {
        result.push({ size, count });
      }
    }
    return result.length ? result : null;
  }

  // Просто число — стандартный размер
  const justNum = parseInt(trimmed, 10);
  if (!isNaN(justNum) && justNum > 0 && trimmed === String(justNum)) {
    return [{ size: 'стандарт', count: justNum }];
  }

  // Формат "1x4x4" — count × dimX × dimY
  const m = trimmed.match(/^(\d+)\s*[x×х]\s*(.+)$/);
  if (m) {
    const count = parseInt(m[1], 10);
    const size = m[2].trim();
    if (!isNaN(count) && count > 0) return [{ size, count }];
  }

  // Не распарсили
  return null;
}

// ─────────────────────────── Step definitions ──────────────────────────

export interface Step {
  key: StepKey;
  prompt: string;
  next: StepKey;
  type: 'text' | 'buttons' | 'numeric' | 'optional_text';
  buttons?: { text: string; data: string }[][];
  optional?: boolean;
}

export const STEPS: Record<StepKey, Step> = {
  client_name: {
    key: 'client_name', type: 'text', next: 'phone',
    prompt: '1/14  <b>Имя клиента или название компании:</b>\nПример: Иванов И.И. или ООО Сибсталь',
  },
  phone: {
    key: 'phone', type: 'text', next: 'object_type',
    prompt: '2/14  <b>Телефон клиента:</b>\nПример: +7 999 123 45 67',
  },
  object_type: {
    key: 'object_type', type: 'buttons', next: 'length',
    prompt: '3/14  <b>Тип объекта:</b>',
    buttons: [
      [{ text: 'Склад',          data: 'w:object_type:sklad' },      { text: 'Ангар',         data: 'w:object_type:angar' }],
      [{ text: 'Производство',   data: 'w:object_type:production' }, { text: 'Коммерческое',  data: 'w:object_type:commercial' }],
      [{ text: 'Навес',          data: 'w:object_type:naves' },      { text: 'Модульное',     data: 'w:object_type:modular' }],
    ],
  },
  length: {
    key: 'length', type: 'numeric', next: 'width',
    prompt: '4/14  <b>Длина в метрах:</b>\nПример: 18',
  },
  width: {
    key: 'width', type: 'numeric', next: 'height',
    prompt: '5/14  <b>Ширина в метрах:</b>\nПример: 6',
  },
  height: {
    key: 'height', type: 'numeric', next: 'frame',
    prompt: '6/14  <b>Высота в метрах:</b>\nПример: 4',
  },
  frame: {
    key: 'frame', type: 'buttons', next: 'cladding',
    prompt: '7/14  <b>Каркас:</b>',
    buttons: [
      [{ text: 'ЛСТК',           data: 'w:frame:lstk' }],
      [{ text: 'Металлокаркас',  data: 'w:frame:metal' }],
      [{ text: 'Модульный',      data: 'w:frame:modular' }],
    ],
  },
  cladding: {
    key: 'cladding', type: 'buttons', next: 'roofing',
    prompt: '8/14  <b>Стены:</b>',
    buttons: [
      [{ text: 'Без стен',  data: 'w:cladding:none' },              { text: 'Профлист', data: 'w:cladding:proflist' }],
      [{ text: 'Сэндвич минвата 150', data: 'w:cladding:sandwich_minvata' }],
      [{ text: 'Сэндвич PIR 150',     data: 'w:cladding:sandwich_pir' }],
    ],
  },
  roofing: {
    key: 'roofing', type: 'buttons', next: 'foundation',
    prompt: '9/14  <b>Кровля:</b>',
    buttons: [
      [{ text: 'Профлист',         data: 'w:roofing:proflist' }],
      [{ text: 'Сэндвич 150мм',    data: 'w:roofing:sandwich' }],
    ],
  },
  foundation: {
    key: 'foundation', type: 'buttons', next: 'gates',
    prompt: '10/14  <b>Фундамент:</b>',
    buttons: [
      [{ text: 'Без фундамента',  data: 'w:foundation:none' }],
      [{ text: 'Свайно-винтовой', data: 'w:foundation:pile' }],
      [{ text: 'Ленточный',       data: 'w:foundation:strip' }],
      [{ text: 'Плита 200мм',     data: 'w:foundation:slab' }],
    ],
  },
  gates: {
    key: 'gates', type: 'optional_text', next: 'windows',
    prompt: '11/14  <b>Ворота:</b>\nКоличество и размер. Примеры:\n• <code>1x4x4</code> — одни 4×4\n• <code>4x4 = 1, 3x3 = 2</code> — несколько\n• <code>нет</code>',
    optional: true,
  },
  windows: {
    key: 'windows', type: 'optional_text', next: 'doors',
    prompt: '12/14  <b>Окна:</b>\nПримеры:\n• <code>2x1500x2000</code> — два окна\n• <code>1500x2000 = 2, 1200x1500 = 3</code>\n• <code>нет</code>',
    optional: true,
  },
  doors: {
    key: 'doors', type: 'optional_text', next: 'logistics_choice',
    prompt: '13/14  <b>Двери:</b>\nПример: <code>2</code> или <code>нет</code>',
    optional: true,
  },
  logistics_choice: {
    key: 'logistics_choice', type: 'buttons', next: 'notes',
    prompt: '14/14  <b>Логистика (доставка материалов):</b>',
    buttons: [
      [{ text: '🚚 Добавить доставку', data: 'w:logistics_choice:yes' }],
      [{ text: '⏭ Не нужно',           data: 'w:logistics_choice:no'  }],
    ],
  },
  logistics_dest: {
    key: 'logistics_dest', type: 'buttons', next: 'notes',
    prompt: '<b>Куда везём?</b>',
    buttons: [
      [{ text: 'Красноярск (включено)',   data: 'w:logistics_dest:krasnoyarsk' }],
      [{ text: 'Хакасия — +200К',          data: 'w:logistics_dest:hakasia' }],
      [{ text: 'Кемерово — +250К',         data: 'w:logistics_dest:kemerovo' }],
      [{ text: 'Иркутск — +350К',          data: 'w:logistics_dest:irkutsk' }],
      [{ text: 'Алтай — +280К',            data: 'w:logistics_dest:altai' }],
      [{ text: 'Другое (указать в примечании)', data: 'w:logistics_dest:other' }],
    ],
  },
  notes: {
    key: 'notes', type: 'optional_text', next: 'confirm',
    prompt: '<b>Примечание</b> (необязательно):\nОсобые требования, сроки, контакты. Или <code>нет</code>.',
    optional: true,
  },
  confirm: {
    key: 'confirm', type: 'buttons', next: 'done',
    prompt: '',
    buttons: [
      [{ text: '✅ Сделать КП',  data: 'w:confirm:yes' }],
      [{ text: '🔧 Поправить',   data: 'w:confirm:edit' }],
      [{ text: '❌ Отмена',      data: 'w:confirm:cancel' }],
    ],
  },
  done: {
    key: 'done', type: 'text', next: 'done',
    prompt: '',
  },
};

// ─────────────────────────── Резюме ──────────────────────────

export function formatSummary(c: Collected): string {
  const area = (c.length ?? 0) * (c.width ?? 0);
  const wallArea = 2 * ((c.length ?? 0) + (c.width ?? 0)) * (c.height ?? 0);

  const objLabel    = OBJECT_TYPES.find(x => x.id === c.object_type)?.label ?? c.object_type ?? '—';
  const frameLabel  = FRAMES.find(x => x.id === c.frame)?.label ?? c.frame ?? '—';
  const claddingLab = CLADDINGS.find(x => x.id === c.cladding)?.label ?? c.cladding ?? '—';
  const roofingLab  = ROOFINGS.find(x => x.id === c.roofing)?.label ?? c.roofing ?? '—';
  const fndLabel    = FOUNDATIONS.find(x => x.id === c.foundation)?.label ?? c.foundation ?? '—';
  const logLabel    = c.logistics_add
    ? LOGISTICS.find(x => x.id === c.logistics_dest)?.label ?? 'указано'
    : 'не нужно';

  const fmtItems = (items?: { size: string; count: number }[]) =>
    items && items.length
      ? items.map(i => `${i.count} × ${i.size}`).join(', ')
      : 'нет';

  const { lines, total, low, high } = calcEstimate(c);

  let msg = `<b>📋 РЕЗЮМЕ КП</b>\n\n`;
  msg += `<b>Клиент:</b> ${c.client_name ?? '—'}\n`;
  msg += `<b>Телефон:</b> <code>${c.phone ?? '—'}</code>\n\n`;
  msg += `<b>Объект:</b> ${objLabel} ${c.length}×${c.width}×${c.height} м (${area} м²)\n`;
  msg += `<b>Каркас:</b> ${frameLabel}\n`;
  msg += `<b>Стены:</b> ${claddingLab} (${wallArea.toFixed(0)} м²)\n`;
  msg += `<b>Кровля:</b> ${roofingLab}\n`;
  msg += `<b>Фундамент:</b> ${fndLabel}\n\n`;
  msg += `<b>Доборные:</b>\n`;
  msg += `• Ворота: ${fmtItems(c.gates)}\n`;
  msg += `• Окна: ${fmtItems(c.windows)}\n`;
  msg += `• Двери: ${c.doors?.count ? c.doors.count + ' шт' : 'нет'}\n\n`;
  msg += `<b>Логистика:</b> ${logLabel}\n`;
  if (c.notes) msg += `\n<i>Примечание: ${c.notes}</i>\n`;

  msg += `\n<b>📊 СМЕТА</b>\n`;
  for (const line of lines) {
    msg += `${line.label}: <code>${formatRub(line.value)}</code>\n`;
  }
  msg += `\n<b>ИТОГО:</b> <b>${formatRub(total)}</b>\n`;
  msg += `<i>Диапазон: ${formatRub(low)} — ${formatRub(high)}</i>\n`;

  return msg;
}

function formatRub(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';
}

// ─────────────────────────── Exports для внешнего использования ──────────────────────────

export {
  OBJECT_TYPES, FRAMES, CLADDINGS, ROOFINGS, FOUNDATIONS, LOGISTICS,
  GATE_PRICE, WINDOW_PRICE, DOOR_PRICE,
};
