// Ценовая модель калькулятора АЗИМЕР.
// Ставки — рыночный baseline по Красноярску (см. pricing_config.json).
// Это ПРЕДВАРИТЕЛЬНАЯ оценка, финальная цена — в КП после уточнения.

export type OptionCard = {
  id: string;
  label: string;
  desc: string;
  rate?: number;
};

export const objectTypes: OptionCard[] = [
  { id: "sklad", label: "Склад", desc: "Хранение товаров, материалов, техники" },
  { id: "angar", label: "Ангар", desc: "Техника, оборудование, производство" },
  { id: "production", label: "Производственное здание", desc: "Цех, корпус, мастерская" },
  { id: "commercial", label: "Коммерческое здание", desc: "Торговля, сервис, услуги" },
  { id: "naves", label: "Навес", desc: "Без стен, открытая конструкция" },
  { id: "modular", label: "Модульное здание", desc: "АБК, офис, бытовые помещения" },
];

export const frameTypes: OptionCard[] = [
  { id: "lstk", label: "ЛСТК", desc: "Лёгкий стальной каркас, быстрый монтаж", rate: 4900 },
  { id: "metal", label: "Металлокаркас", desc: "Чёрный прокат, большие пролёты и нагрузки", rate: 5300 },
  { id: "modular", label: "Модульный", desc: "Блок-модули с готовым контуром", rate: 35000 },
];

// Ставки сэндвич-панелей 150мм минвата — из прайса Азамата от 20.05.2026
// (включает материал с наценкой 20% + расходники: саморезы, фасон, герметик).
// Толщину 100мм и PIR проставлены пропорционально от минваты 150мм.
export const claddingTypes: OptionCard[] = [
  { id: "none", label: "Без стен", desc: "Открытый навес", rate: 0 },
  { id: "proflist", label: "Профлист", desc: "Эконом, неотапливаемые здания", rate: 700 },
  { id: "sandwich_minvata", label: "Сэндвич минвата 150мм", desc: "Утеплённые здания, стандарт", rate: 3500 },
  { id: "sandwich_pir", label: "Сэндвич PIR 150мм", desc: "Премиум теплоизоляция", rate: 4100 },
];

export const roofingTypes: OptionCard[] = [
  { id: "proflist", label: "Профлист", desc: "Неотапливаемые здания, бюджет", rate: 900 },
  { id: "sandwich", label: "Сэндвич-панель 150мм", desc: "Утеплённая кровля минвата", rate: 3800 },
];

export const foundationTypes: OptionCard[] = [
  { id: "none", label: "Без фундамента", desc: "Уже готов или не требуется", rate: 0 },
  { id: "pile", label: "Свайно-ростверковый", desc: "Оптимально для ЛСТК", rate: 2800 },
  { id: "strip", label: "Ленточный", desc: "Универсальное решение", rate: 3500 },
  { id: "slab", label: "Монолитная плита", desc: "Нагрузка на пол, оборудование", rate: 5500 },
];

export const optionItems = [
  { id: "gate", label: "Ворота", desc: "Секционные / распашные", price: 35000 },
  { id: "window", label: "Окна", desc: "Промышленные ПВХ", price: 12000 },
  { id: "door", label: "Двери", desc: "Металлические входные", price: 15000 },
];

export type WizardState = {
  objectType: string;
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
};

const rateOf = (list: OptionCard[], id: string) =>
  list.find((x) => x.id === id)?.rate ?? 0;

export function calcEstimate(s: WizardState): Estimate {
  const area = Math.max(0, s.length * s.width);
  const wallArea = Math.max(0, 2 * (s.length + s.width) * s.height);
  const isModular = s.frame === "modular";

  const lines: { label: string; value: number }[] = [];

  // Каркас (для модульного — ставка уже включает контур)
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
  };
}

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}
