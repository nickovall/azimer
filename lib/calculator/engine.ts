// АЗИМЕР — движок калькулятора v2
// Главная функция: BuildingInput → Estimate

import type { BuildingInput, Estimate, LineItem, EstimateTotals } from "./types";
import { CATALOG_VERSION, FINANCE } from "./catalog";
import { classify } from "./classifier";
import { computeGeometry, round } from "./geometry";

import { calculateWalls }      from "./modules/walls";
import { calculateRoof }       from "./modules/roof";
import { calculateFrame }      from "./modules/frame";
import { calculateFoundation } from "./modules/foundation";
import { calculateOpenings }   from "./modules/openings";
import { calculateLogistics }  from "./modules/logistics";

export function calculate(input: BuildingInput): Estimate {
  // 1. Классификация
  const cls = classify(input);

  // 2. Геометрия
  const geo = computeGeometry(input);

  // 3. Сборка спецификации по модулям
  const lines: LineItem[] = [
    ...calculateFoundation(input, geo),
    ...calculateFrame(input, geo),
    ...calculateWalls(input, geo),
    ...calculateRoof(input, geo),
    ...calculateOpenings(input),
    ...calculateLogistics(input),
  ];

  // 4. Итоги
  const totals = computeTotals(lines);

  return {
    input,
    complexity:  cls.complexity,
    flags:       cls.flags,
    metadata: {
      floorArea: round(geo.floorArea, 1),
      wallArea:  round(geo.wallArea, 1),
      roofArea:  round(geo.roofArea, 1),
      perimeter: round(geo.perimeter, 1),
      volume:    round(geo.volume, 1),
    },
    lines,
    totals,
    catalogVersion: CATALOG_VERSION,
    calculatedAt:   new Date().toISOString(),
  };
}

function computeTotals(lines: LineItem[]): EstimateTotals {
  const sumByCategory = (cat: string) =>
    lines.filter(l => l.category === cat).reduce((s, l) => s + l.total, 0);

  const materials = sumByCategory("material");
  const works     = sumByCategory("work");
  const logistics = sumByCategory("logistics");
  const direct    = materials + works + logistics;

  // ФОТ ≈ 60% от работ (МДС 81-33)
  const fot = works * FINANCE.fot_share_of_works;

  // Накладные и сметная прибыль (МДС 81-33 / МДС 81-25)
  const overhead = fot * FINANCE.overhead_pct_of_FOT;
  const profit   = fot * FINANCE.profit_pct_of_FOT;

  // Запас компании
  const beforeMarginBase = direct + overhead + profit;
  const margin = beforeMarginBase * FINANCE.company_margin_pct;

  const beforeMarkup = beforeMarginBase + margin;

  // Наценка клиенту 20%
  const markup = beforeMarkup * FINANCE.client_markup_pct;
  const final = beforeMarkup + markup;

  const low  = Math.round((final * 0.90) / 1000) * 1000;
  const high = Math.round((final * 1.15) / 1000) * 1000;

  return {
    materials:    round(materials),
    works:        round(works),
    logistics:    round(logistics),
    direct:       round(direct),
    overhead:     round(overhead),
    profit:       round(profit),
    margin:       round(margin),
    beforeMarkup: round(beforeMarkup),
    markup:       round(markup),
    final:        round(final),
    low,
    high,
  };
}

// ────────────────── Утилиты для вывода ──────────────────

export function groupLinesByGroup(lines: LineItem[]): Record<string, LineItem[]> {
  const out: Record<string, LineItem[]> = {};
  for (const l of lines) {
    if (!out[l.group]) out[l.group] = [];
    out[l.group].push(l);
  }
  return out;
}

export function groupLabel(group: string): string {
  return ({
    frame:      "🏗️  Каркас",
    walls:      "🧱  Стены",
    roof:       "🏠  Кровля",
    foundation: "🟦  Фундамент",
    openings:   "🚪  Доборные элементы",
    logistics:  "🚚  Логистика",
    overhead:   "📊  Накладные расходы",
  } as Record<string, string>)[group] ?? group;
}

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}
