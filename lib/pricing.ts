// Ценовая модель калькулятора АЗИМЕР.
// Ставки — рыночный baseline по Красноярскому краю на 2026 год
// (исследование цен конкурентов ФСМ-24, Антей-СК, АМС-МК, Velestent, СЗСМ, rsb96,
//  Vorota-Nord, ФундаментПодКлюч-24, Bytovki-RF и др.).
// Цены = МАТЕРИАЛ + РАБОТА (под ключ), без логистики и без внутренних инженерных систем.
// Это ПРЕДВАРИТЕЛЬНАЯ оценка, финальная цена — в КП после уточнения с Азаматом.

export type OptionCard = {
  id: string;
  label: string;
  desc: string;
  rate?: number;
};

// Регионы строительства — влияют на снеговые/ветровые нагрузки, сейсмику, мерзлоту, зимнюю надбавку.
// Данные из lib/calculator/regions.ts
export const regionTypes: OptionCard[] = [
  { id: "krsk_city",     label: "Красноярск и пригороды", desc: "Sg≈1,35 кПа, ветровой район I. Базовый расчёт" },
  { id: "krsk_south",    label: "Юг края / Хакасия",     desc: "Сейсмика 7 баллов — усиленные узлы каркаса" },
  { id: "krsk_kansk",    label: "Канск / Ачинск",        desc: "Sg до 1,25 кПа. Конкретную площадку уточняем" },
  { id: "krsk_north_pre",label: "Лесосибирск / Енисейск", desc: "Север края: повышенный снег и зимний коэффициент" },
  { id: "krsk_priangar", label: "Богучаны / Кодинск",    desc: "Приангарье: ориентир Sg≈2,0 кПа" },
  { id: "krsk_evenkia",  label: "Эвенкия (мерзлота)",    desc: "Инженерная проверка: мерзлота и северный климат" },
  { id: "krsk_taymyr",   label: "Таймыр / Норильск",     desc: "Инженерная проверка: Sg≈2,4 кПа, ветер и мерзлота" },
  { id: "tuva",          label: "Тува",                   desc: "Инженерная проверка: сейсмика 8 баллов" },
  { id: "kemerovo",      label: "Кемеровская область",    desc: "Ориентир Sg≈1,8 кПа, зависит от города" },
  { id: "irkutsk",       label: "Иркутская область",      desc: "III снеговая зона" },
  { id: "altai",         label: "Алтай",                  desc: "Юг Сибири, мягкие зимы" },
  { id: "other",         label: "Другое направление",     desc: "Параметры уточняются индивидуально" },
];

export const objectTypes: OptionCard[] = [
  { id: "sklad", label: "Склад", desc: "Хранение товаров, материалов, техники" },
  { id: "angar", label: "Ангар", desc: "Техника, оборудование, производство" },
  { id: "production", label: "Производственное здание", desc: "Цех, корпус, мастерская" },
  { id: "commercial", label: "Коммерческое здание", desc: "Торговля, сервис, услуги" },
  { id: "naves", label: "Навес", desc: "Без стен, открытая конструкция" },
  { id: "modular", label: "Модульное здание", desc: "АБК, офис, бытовые помещения" },
];

// Каркас — за м² пятна застройки, под ключ.
// ЛСТК — утеплённое исполнение по медиане rsholod/kamprok.
// Металлокаркас — Антей-СК «от 14 000» снижен до 13 000 для конкурентности.
// Модульный — за м² готового модуля (средняя bytovki-rf / sava / moduls24).
export const frameTypes: OptionCard[] = [
  { id: "lstk", label: "ЛСТК", desc: "Лёгкий стальной каркас, быстрый монтаж", rate: 10500 },
  { id: "metal", label: "Металлокаркас", desc: "Чёрный прокат, большие пролёты и нагрузки", rate: 13000 },
  { id: "modular", label: "Модульный", desc: "Блок-модули с готовым контуром", rate: 38000 },
];

// Стены — материал с наценкой 20% + работа монтажа + расходники (саморезы, фасон, герметик).
// Сэндвич 150мм минвата = 3030 (материал Азамат) + 700 (монтаж ФСМ-24) + 170 (расходники) ≈ 3900.
// PIR пропорционально больше минваты на ~18%.
// Профлист — материал крашеный RAL + работа монтажа.
export const claddingTypes: OptionCard[] = [
  { id: "none", label: "Без стен", desc: "Открытый навес", rate: 0 },
  { id: "proflist", label: "Профлист", desc: "Эконом, неотапливаемые здания", rate: 850 },
  { id: "sandwich_minvata", label: "Сэндвич минвата 150мм", desc: "Утеплённые здания, стандарт", rate: 4100 },
  { id: "sandwich_pir", label: "Сэндвич PIR 150мм", desc: "Премиум теплоизоляция", rate: 4600 },
];

// Кровля — за м² проекции (без учёта уклона).
// Сэндвич 150мм минвата = 3331 (материал Азамат) + 710 (монтаж) + ~60 (фасон) ≈ 4100.
export const roofingTypes: OptionCard[] = [
  { id: "proflist", label: "Профлист", desc: "Неотапливаемые здания, бюджет", rate: 950 },
  { id: "sandwich", label: "Сэндвич-панель 150мм", desc: "Утеплённая кровля минвата", rate: 4500 },
];

// Фундамент — за м² пятна застройки, под ключ.
// Свайно-винтовой: 5500 ₽/свая × расход 1 свая на ~1.8 м² = 3050 ₽/м².
// Ленточный — на основе fundament98 переведено в м² пятна.
// Плита 200мм — медиана fundament98.
export const foundationTypes: OptionCard[] = [
  { id: "none", label: "Без фундамента", desc: "Уже готов или не требуется", rate: 0 },
  { id: "pile", label: "Свайно-винтовой", desc: "Оптимально для ЛСТК и каркасных", rate: 3050 },
  { id: "strip", label: "Ленточный", desc: "Универсальное решение", rate: 4500 },
  { id: "slab", label: "Монолитная плита 200мм", desc: "Нагрузка на пол, оборудование", rate: 6500 },
];

// Доборные элементы — за штуку, под ключ с монтажом.
// Ворота секционные 4×4 м (типовой размер) — vorota-nord медиана.
// Окно ПВХ 1500×2000 промышленное — leman/oknatrade + монтаж.
// Дверь металлическая входная — рыночная медиана с монтажом.
export const optionItems = [
  { id: "gate", label: "Ворота секционные 4×4", desc: "Промышленные с автоматикой", price: 180000 },
  { id: "window", label: "Окна ПВХ", desc: "Промышленные 1500×2000", price: 22000 },
  { id: "door", label: "Двери", desc: "Металлические входные с монтажом", price: 18000 },
];

export type WizardState = {
  objectType: string;
  region: string;
  frame: string;
  length: number;
  width: number;
  height: number;
  cladding: string;
  roofing: string;
  foundation: string;
  options: Record<string, number>;
};

export const initialState: WizardState = {
  objectType: "",
  region: "",
  frame: "",
  length: 0,
  width: 0,
  height: 0,
  cladding: "",
  roofing: "",
  foundation: "",
  options: { gate: 0, window: 0, door: 0 },
};

export type Estimate = {
  area: number;
  wallArea: number;
  lines: { label: string; value: number }[];
  base: number;
  low: number;
  high: number;
  complexity: "TYPICAL" | "EXTENDED" | "ENGINEER_REQUIRED";
  flags: string[];
  regionLabel: string;
  catalogVersion?: string;
};

// Подключение к новому движку калькулятора v2
import { calculate as engineCalculate } from "@/lib/calculator";
import type { BuildingInput } from "@/lib/calculator/types";

// Мапинг старых ID к новым (бот/сайт wizard → engine input)
const mapFrame = (s: string): BuildingInput["frame"] =>
  s === "lstk" ? "lstk" : s === "metal" ? "metal" : "modular";

const mapCladding = (s: string): BuildingInput["cladding"] =>
  s === "sandwich_minvata" ? "sandwich_minvata"
  : s === "sandwich_pir"    ? "sandwich_pir"
  : s === "proflist"        ? "proflist"
  : "none";

const mapRoofing = (s: string): BuildingInput["roofing"] =>
  s === "sandwich" ? "sandwich_minvata" : s === "proflist" ? "proflist" : "proflist";

const mapFoundation = (s: string): BuildingInput["foundation"] => {
  if (s === "pile")  return "pile_screw";
  if (s === "strip") return "strip";
  if (s === "slab")  return "slab_200";
  return "none";
};

// Маппинг wizard state → BuildingInput для движка калькулятора.
// Экспортируется, чтобы /kp получал именно BuildingInput (тот же формат,
// что серверный buildKpUrlForLead), а не сырой WizardState — иначе /kp
// не может пересчитать и показывает «Не удалось загрузить данные КП».
export function stateToInput(s: WizardState): BuildingInput {
  return {
    objectType: (s.objectType || "sklad") as BuildingInput["objectType"],
    region:     s.region || undefined,   // → engine.ts → getRegion(id) → снег/ветер/сейсмика/мерзлота
    length:     s.length,
    width:      s.width,
    height:     s.height,
    frame:      mapFrame(s.frame),
    cladding:   mapCladding(s.cladding),
    claddingThk: mapCladding(s.cladding).startsWith("sandwich") ? 150 : undefined,
    roofing:    mapRoofing(s.roofing),
    roofingThk: mapRoofing(s.roofing).startsWith("sandwich") ? 150 : undefined,
    foundation: mapFoundation(s.foundation),
    gates:      (s.options.gate ?? 0) > 0   ? [{ size: "4x4",       count: s.options.gate }]   : [],
    windows:    (s.options.window ?? 0) > 0 ? [{ size: "1500x2000", count: s.options.window }] : [],
    doors:      { count: s.options.door ?? 0 },
    logisticsAdd: false,
  };
}

export function calcEstimate(s: WizardState): Estimate {
  const area = Math.max(0, s.length * s.width);
  const wallArea = Math.max(0, 2 * (s.length + s.width) * s.height);

  // Маппинг wizard state → BuildingInput для нового движка
  const input = stateToInput(s);

  // Если калькулятор не готов посчитать (нулевые размеры) — возвращаем пустое
  if (area <= 0 || s.height <= 0 || !s.frame) {
    return {
      area,
      wallArea,
      lines: [],
      base: 0,
      low: 0,
      high: 0,
      complexity: "TYPICAL",
      flags: [],
      regionLabel: labelOf(regionTypes, s.region),
    };
  }

  const eng = engineCalculate(input);

  // Группируем строки движка по категориям и РАСПРЕДЕЛЯЕМ НР+СП+маржу+наценку
  // пропорционально каждой группе — чтобы клиент НЕ видел отдельной строки "маржа".
  // Это стандартная практика в КП: цены позиций "под ключ" включают всё.
  const groupSums: Record<string, number> = {};
  for (const l of eng.lines) {
    groupSums[l.group] = (groupSums[l.group] ?? 0) + l.total;
  }

  const directSum = Object.values(groupSums).reduce((s, v) => s + v, 0);
  // Множитель = final / direct (распределяем НР+СП+маржу+наценку пропорционально)
  const multiplier = directSum > 0 ? eng.totals.final / directSum : 1;

  const groupLabels: Record<string, string> = {
    frame:      "Каркас",
    walls:      "Стеновое ограждение",
    roof:       "Кровля",
    foundation: "Фундамент",
    openings:   "Доборные элементы",
    logistics:  "Логистика",
  };
  const lines: { label: string; value: number }[] = [];
  for (const [key, value] of Object.entries(groupSums)) {
    if (value > 0) {
      lines.push({
        label: groupLabels[key] ?? key,
        value: Math.round(value * multiplier),
      });
    }
  }

  return {
    area,
    wallArea,
    lines,
    base: eng.totals.final,
    low:  eng.totals.low,
    high: eng.totals.high,
    complexity: eng.complexity,
    flags: eng.flags,
    regionLabel: labelOf(regionTypes, s.region),
    catalogVersion: eng.catalogVersion,
  };
}

// ── Legacy helpers (оставлены для обратной совместимости, не используются)

const rateOf = (list: OptionCard[], id: string) =>
  list.find((x) => x.id === id)?.rate ?? 0;

function _legacyCalcEstimate(s: WizardState): Estimate {
  const area = Math.max(0, s.length * s.width);
  const wallArea = Math.max(0, 2 * (s.length + s.width) * s.height);
  const isModular = s.frame === "modular";

  const lines: { label: string; value: number }[] = [];

  const frameCost = area * rateOf(frameTypes, s.frame);
  lines.push({ label: "Каркас", value: frameCost });

  if (!isModular) {
    const claddingCost = wallArea * rateOf(claddingTypes, s.cladding);
    if (claddingCost > 0) lines.push({ label: "Стеновое ограждение", value: claddingCost });

    const roofingCost = area * rateOf(roofingTypes, s.roofing);
    if (roofingCost > 0) lines.push({ label: "Кровля", value: roofingCost });
  }

  const foundationCost = area * rateOf(foundationTypes, s.foundation);
  if (foundationCost > 0) lines.push({ label: "Фундамент", value: foundationCost });

  const optionsCost = optionItems.reduce(
    (sum, o) => sum + (s.options[o.id] || 0) * o.price,
    0,
  );
  if (optionsCost > 0) lines.push({ label: "Доборные элементы", value: optionsCost });

  const base = lines.reduce((sum, l) => sum + l.value, 0);

  return {
    area,
    wallArea,
    lines,
    base,
    low: Math.round((base * 0.9) / 1000) * 1000,
    high: Math.round((base * 1.15) / 1000) * 1000,
    complexity: "TYPICAL",
    flags: [],
    regionLabel: labelOf(regionTypes, s.region),
  };
}

export const labelOf = (
  list: { id: string; label: string }[],
  id: string,
): string => list.find((x) => x.id === id)?.label ?? "—";

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}
