// Расчёт стен — материал + крепёж + доборка + работы

import type { BuildingInput, LineItem, CladdingThickness } from "../types";
import type { Geometry } from "../geometry";
import { round, ceil } from "../geometry";
import { SANDWICH, PROFLIST, TRIM, HARDWARE, WORKS } from "../catalog";
import { SANDWICH_NORMS, PROFLIST_NORMS } from "../consumption";

export function calculateWalls(input: BuildingInput, geo: Geometry): LineItem[] {
  if (input.cladding === "none" || input.frame === "modular") return [];

  const A = geo.wallArea;       // м² стен
  const P = geo.perimeter;       // м.п. периметр

  if (A <= 0) return [];

  // Маршрутизация по типу облицовки
  if (input.cladding === "sandwich_minvata") return sandwichWalls(input, A, P, "minvata");
  if (input.cladding === "sandwich_pir")     return sandwichWalls(input, A, P, "pir");
  if (input.cladding === "proflist")         return proflistWalls(A);

  return [];
}

function sandwichWalls(
  input: BuildingInput, A: number, P: number,
  kind: "minvata" | "pir",
): LineItem[] {
  const lines: LineItem[] = [];
  const thk = (input.claddingThk ?? 150) as CladdingThickness;

  const priceMap = kind === "minvata" ? SANDWICH.wall_minvata : SANDWICH.wall_pir;
  const matPrice = (priceMap as Record<number, number>)[thk] ?? 3030;

  // 1. Сэндвич-панель с учётом отхода
  const qtyPanel = round(A * (1 + SANDWICH_NORMS.waste_factor), 1);
  lines.push({
    category: "material", group: "walls",
    name: `Сэндвич-панель стен. ${kind === "minvata" ? "минвата" : "PIR"} ${thk}мм RAL 9003`,
    quantity: qtyPanel,
    unit: "м²",
    unitPrice: matPrice,
    total: round(qtyPanel * matPrice),
    note: `Расход +5% на отход, базовая площадь ${A.toFixed(0)} м²`,
  });

  // 2. Саморезы — с учётом краевой зоны
  const edgeArea = A * SANDWICH_NORMS.edge_zone_share;
  const fieldArea = A - edgeArea;
  const screwQty = ceil(
    fieldArea * SANDWICH_NORMS.screws_per_m2_field +
    edgeArea  * SANDWICH_NORMS.screws_per_m2_edge,
  );
  const screwUnit =
    thk <= 100 ? HARDWARE.screw_sandwich_135 :
    thk <= 150 ? HARDWARE.screw_sandwich_185 :
                 HARDWARE.screw_sandwich_235;
  const screwSize =
    thk <= 100 ? "6,3×135 мм" :
    thk <= 150 ? "6,3×185 мм" : "6,3×235 мм";
  lines.push({
    category: "material", group: "walls",
    name: `Саморез для сэндвич-панели ${screwSize}`,
    quantity: screwQty,
    unit: "шт",
    unitPrice: screwUnit,
    total: round(screwQty * screwUnit),
    note: `${SANDWICH_NORMS.screws_per_m2_field} шт/м² в поле + надбавка на углы`,
  });

  // 3. Герметик силиконовый
  const sealantQty = ceil(P * 2 * SANDWICH_NORMS.sealant_tubes_per_m);
  lines.push({
    category: "material", group: "walls",
    name: "Герметик силиконовый универсальный",
    quantity: sealantQty,
    unit: "туба",
    unitPrice: HARDWARE.sealant_silicone_tube,
    total: round(sealantQty * HARDWARE.sealant_silicone_tube),
    note: "1 туба на 8 м.п. шва",
  });

  // 4. Пена монтажная (летняя)
  const foamQty = ceil(P * 2 * SANDWICH_NORMS.foam_cans_per_m);
  lines.push({
    category: "material", group: "walls",
    name: "Пена монтажная летняя",
    quantity: foamQty,
    unit: "балл.",
    unitPrice: HARDWARE.foam_summer_can,
    total: round(foamQty * HARDWARE.foam_summer_can),
  });

  // 5. Фасонные элементы (нащельники, отливы, парапеты)
  const trimQty = round(A * SANDWICH_NORMS.edge_trim_factor, 1);
  lines.push({
    category: "material", group: "walls",
    name: "Фасонные элементы RAL 7004 (металл 0,5 мм)",
    quantity: trimQty,
    unit: "м²",
    unitPrice: TRIM.edge_painted_per_m2,
    total: round(trimQty * TRIM.edge_painted_per_m2),
    note: "Нащельники, парапеты, угловые планки",
  });

  // 6. Лента уплотнительная
  const tapeQty = round(A * SANDWICH_NORMS.tape_per_m2, 0);
  lines.push({
    category: "material", group: "walls",
    name: "Лента уплотнительная",
    quantity: tapeQty,
    unit: "м",
    unitPrice: HARDWARE.tape_seal_per_m,
    total: round(tapeQty * HARDWARE.tape_seal_per_m),
  });

  // 7. Работа — монтаж сэндвич-стен
  lines.push({
    category: "work", group: "walls",
    name: "Монтаж сэндвич-стен",
    quantity: round(A, 1),
    unit: "м²",
    unitPrice: WORKS.sandwich_wall_per_m2,
    total: round(A * WORKS.sandwich_wall_per_m2),
  });

  // 8. Работа — герметизация швов
  lines.push({
    category: "work", group: "walls",
    name: "Герметизация швов",
    quantity: round(P * 2, 0),
    unit: "м.п.",
    unitPrice: WORKS.sealant_work_per_m,
    total: round(P * 2 * WORKS.sealant_work_per_m),
  });

  return lines;
}

function proflistWalls(A: number): LineItem[] {
  const lines: LineItem[] = [];
  const qty = round(A * (1 + PROFLIST_NORMS.waste_factor), 1);

  lines.push({
    category: "material", group: "walls",
    name: "Профлист стеновой С8 RAL (0,5 мм)",
    quantity: qty,
    unit: "м²",
    unitPrice: PROFLIST.wall_painted,
    total: round(qty * PROFLIST.wall_painted),
  });

  const screws = ceil(qty * PROFLIST_NORMS.screws_per_m2);
  lines.push({
    category: "material", group: "walls",
    name: "Саморез кровельный 4,8×35 RAL 7004",
    quantity: screws,
    unit: "шт",
    unitPrice: HARDWARE.screw_roof_35_RAL,
    total: round(screws * HARDWARE.screw_roof_35_RAL),
  });

  lines.push({
    category: "work", group: "walls",
    name: "Монтаж профлиста стенового",
    quantity: round(A, 1),
    unit: "м²",
    unitPrice: WORKS.proflist_wall_per_m2,
    total: round(A * WORKS.proflist_wall_per_m2),
  });

  return lines;
}
