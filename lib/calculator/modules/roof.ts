// Расчёт кровли — материал + крепёж + работы

import type { BuildingInput, LineItem, CladdingThickness } from "../types";
import type { Geometry } from "../geometry";
import { round, ceil } from "../geometry";
import { SANDWICH, PROFLIST, TRIM, HARDWARE, WORKS } from "../catalog";
import { SANDWICH_NORMS, PROFLIST_NORMS } from "../consumption";

export function calculateRoof(input: BuildingInput, geo: Geometry): LineItem[] {
  if (input.frame === "modular") return [];

  const A = geo.roofArea;        // м² кровли с уклоном
  if (A <= 0) return [];

  if (input.roofing === "sandwich_minvata") return sandwichRoof(input, A, geo.perimeter, "minvata");
  if (input.roofing === "sandwich_pir")     return sandwichRoof(input, A, geo.perimeter, "pir");
  if (input.roofing === "proflist")         return proflistRoof(A);

  return [];
}

function sandwichRoof(
  input: BuildingInput, A: number, P: number,
  kind: "minvata" | "pir",
): LineItem[] {
  const lines: LineItem[] = [];
  const thk = (input.roofingThk ?? input.claddingThk ?? 150) as CladdingThickness;

  const priceMap = kind === "minvata" ? SANDWICH.roof_minvata : SANDWICH.roof_pir;
  const matPrice = (priceMap as Record<number, number>)[thk] ?? 3331;

  // 1. Сэндвич кровля
  const qtyPanel = round(A * (1 + SANDWICH_NORMS.waste_factor), 1);
  lines.push({
    category: "material", group: "roof",
    name: `Сэндвич-панель кровельная ${kind === "minvata" ? "минвата" : "PIR"} ${thk}мм`,
    quantity: qtyPanel,
    unit: "м²",
    unitPrice: matPrice,
    total: round(qtyPanel * matPrice),
    note: `Базовая площадь ${A.toFixed(0)} м² (с уклоном)`,
  });

  // 2. Саморезы кровельные
  const screwQty = ceil(qtyPanel * SANDWICH_NORMS.screws_per_m2_field);
  const screwUnit =
    thk <= 100 ? HARDWARE.screw_sandwich_135 :
    thk <= 150 ? HARDWARE.screw_sandwich_185 :
                 HARDWARE.screw_sandwich_235;
  const screwSize =
    thk <= 100 ? "6,3×135 мм" :
    thk <= 150 ? "6,3×185 мм" : "6,3×235 мм";
  lines.push({
    category: "material", group: "roof",
    name: `Саморез для сэндвич-панели ${screwSize}`,
    quantity: screwQty,
    unit: "шт",
    unitPrice: screwUnit,
    total: round(screwQty * screwUnit),
  });

  // 3. Конёк / нащельники
  const ridgeQty = round(Math.max(input.length, input.width), 0);
  lines.push({
    category: "material", group: "roof",
    name: "Конёк кровельный RAL 7004",
    quantity: ridgeQty,
    unit: "м.п.",
    unitPrice: TRIM.ridge_per_m,
    total: round(ridgeQty * TRIM.ridge_per_m),
  });

  // 4. Фасонка по периметру кровли
  const trimQty = round(P * 0.15, 0);
  lines.push({
    category: "material", group: "roof",
    name: "Нащельники / парапетные планки кровли",
    quantity: trimQty,
    unit: "м.п.",
    unitPrice: TRIM.flashing_per_m,
    total: round(trimQty * TRIM.flashing_per_m),
  });

  // 5. Работа — монтаж кровли
  lines.push({
    category: "work", group: "roof",
    name: "Монтаж сэндвич-кровли",
    quantity: round(A, 1),
    unit: "м²",
    unitPrice: WORKS.sandwich_roof_per_m2,
    total: round(A * WORKS.sandwich_roof_per_m2),
  });

  return lines;
}

function proflistRoof(A: number): LineItem[] {
  const lines: LineItem[] = [];
  const qty = round(A * (1 + PROFLIST_NORMS.waste_factor), 1);

  lines.push({
    category: "material", group: "roof",
    name: "Профлист кровельный С21 RAL (0,5 мм)",
    quantity: qty,
    unit: "м²",
    unitPrice: PROFLIST.roof_painted,
    total: round(qty * PROFLIST.roof_painted),
  });

  const screws = ceil(qty * PROFLIST_NORMS.screws_per_m2);
  lines.push({
    category: "material", group: "roof",
    name: "Саморез кровельный 4,8×60 RAL 7004",
    quantity: screws,
    unit: "шт",
    unitPrice: HARDWARE.screw_roof_60_RAL,
    total: round(screws * HARDWARE.screw_roof_60_RAL),
  });

  lines.push({
    category: "work", group: "roof",
    name: "Монтаж кровли из профлиста",
    quantity: round(A, 1),
    unit: "м²",
    unitPrice: WORKS.proflist_roof_per_m2,
    total: round(A * WORKS.proflist_roof_per_m2),
  });

  return lines;
}
