// АЗИМЕР — движок калькулятора v2
// Главная функция: BuildingInput → Estimate

import type { BuildingInput, Estimate, LineItem, EstimateTotals } from "./types";
import { CATALOG_VERSION, FINANCE } from "./catalog";
import { classify } from "./classifier";
import { computeGeometry, round } from "./geometry";
import { getRegion, isWinterPeriod } from "./regions";

import { calculateWalls }      from "./modules/walls";
import { calculateRoof }       from "./modules/roof";
import { calculateFrame, detectInsulation } from "./modules/frame";
import { calculateFoundation } from "./modules/foundation";
import { calculateOpenings }   from "./modules/openings";

// Множитель эконом-линейки (арочный тент-каркас)
// Конструктив на 60-70% легче полноценного каркаса, без серьёзного фундамента
const ECONOMY_TENT_MULTIPLIER = 0.33;

export function calculate(input: BuildingInput): Estimate {
  validateInput(input);

  // 0. Подставляем параметры региона в Input (если не заданы явно)
  const region = getRegion(input.region);
  const enrichedInput: BuildingInput = {
    ...input,
    snowZone:     input.snowZone     ?? region.snowZone,
    windZone:     input.windZone     ?? region.windZone,
    snowLoadKPa:  input.snowLoadKPa  ?? region.snowLoadKPa,
    windPressureKPa: input.windPressureKPa ?? region.windPressureKPa,
    seismicLevel: input.seismicLevel ?? region.seismicLevel,
  };

  // 1. Классификация
  const cls = classify(enrichedInput);

  // 2. Геометрия
  const geo = computeGeometry(enrichedInput);
  // Используем enriched всюду ниже
  input = enrichedInput;

  // 3. Сборка спецификации по модулям (БЕЗ логистики — её Азамат считает отдельно)
  const lines: LineItem[] = [
    ...calculateFoundation(input, geo),
    ...calculateFrame(input, geo),
    ...calculateWalls(input, geo),
    ...calculateRoof(input, geo),
    ...calculateOpenings(input),
  ];

  // 3.1. Для холодных объектов — снижаем работы и накладные
  const insulation = detectInsulation(input);
  const isCold = insulation === "cold";

  // 3.2. Скидка от объёма (рыночный паттерн: МС-Ангар, АМС-МК, СтройСибМонтаж)
  const A = geo.floorArea;
  let volumeMultiplier =
    A >= 1500 ? 0.80 :   // -20%
    A >= 800  ? 0.85 :   // -15%
    A >= 500  ? 0.90 :   // -10%
                1.0;

  // 3.2b. Эконом-линейка — арочный тент-каркас в 3 раза дешевле
  if (input.objectType === "tent_arched") {
    volumeMultiplier *= ECONOMY_TENT_MULTIPLIER;
  }

  // 3.3. Зимняя надбавка к работам (обогрев бетона, доплата за холод дек-март)
  // Применяется ТОЛЬКО если строительство в зимний период ИЛИ region.winterSurchargePct
  // высокий (для регионов где зима почти круглый год — Норильск, Эвенкия)
  const winterMul = region.permafrost
    ? 1 + region.winterSurchargePct           // мерзлота — всегда применяем
    : isWinterPeriod()
      ? 1 + region.winterSurchargePct
      : 1.0;

  // 4. Итоги
  // Холодный ангар: работы −15% (проще монтаж), НР −25% (меньше обслуживания),
  // наценка 15% (ниже маржа из-за конкуренции). Металл ×0.60 уже в frame.ts.
  const totals = computeTotals(lines, {
    worksMultiplier:    (isCold ? 0.85 : 1.0) * winterMul,
    finalMultiplier:    volumeMultiplier,
    overheadMultiplier: isCold ? 0.75 : 1.0,
    markupOverride:     isCold ? 0.15 : undefined,
  });

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

function validateInput(input: BuildingInput): void {
  const positiveFields: Array<[string, number]> = [
    ["length", input.length],
    ["width", input.width],
    ["height", input.height],
  ];
  for (const [name, value] of positiveFields) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a positive number`);
    }
  }

  const nonNegativeCounts: Array<[string, number]> = [
    ...((input.gates ?? []).map((g, i) => [`gates[${i}].count`, g.count] as [string, number])),
    ...((input.windows ?? []).map((w, i) => [`windows[${i}].count`, w.count] as [string, number])),
    ["doors.count", input.doors?.count ?? 0],
  ];
  for (const [name, value] of nonNegativeCounts) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${name} must be a non-negative number`);
    }
  }
}

function computeTotals(
  lines: LineItem[],
  opts: {
    worksMultiplier?:    number;
    finalMultiplier?:    number;
    overheadMultiplier?: number;
    markupOverride?:     number;
  } = {},
): EstimateTotals {
  const sumByCategory = (cat: string) =>
    lines.filter(l => l.category === cat).reduce((s, l) => s + l.total, 0);

  const finalMul  = opts.finalMultiplier ?? 1;
  const materials = sumByCategory("material") * finalMul;
  const works     = sumByCategory("work") * (opts.worksMultiplier ?? 1) * finalMul;
  const logistics = sumByCategory("logistics");
  const direct    = materials + works + logistics;

  // ФОТ ≈ 60% от работ (МДС 81-33)
  const fot = works * FINANCE.fot_share_of_works;

  // Накладные и сметная прибыль (МДС 81-33 / МДС 81-25)
  const ovhMul = opts.overheadMultiplier ?? 1;
  const overhead = fot * FINANCE.overhead_pct_of_FOT * ovhMul;
  const profit   = fot * FINANCE.profit_pct_of_FOT   * ovhMul;

  // Запас компании
  const beforeMarginBase = direct + overhead + profit;
  const margin = beforeMarginBase * FINANCE.company_margin_pct;

  const beforeMarkup = beforeMarginBase + margin;

  // Наценка клиенту (по умолчанию 20%, для холодного — 10%)
  const markupPct = opts.markupOverride ?? FINANCE.client_markup_pct;
  const markup = beforeMarkup * markupPct;
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
