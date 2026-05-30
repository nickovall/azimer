// Расчёт фундамента

import type { BuildingInput, LineItem } from "../types";
import type { Geometry } from "../geometry";
import { round, ceil } from "../geometry";
import { FOUNDATION, WORKS } from "../catalog";
import { FOUNDATION_NORMS } from "../consumption";

export function calculateFoundation(input: BuildingInput, geo: Geometry): LineItem[] {
  switch (input.foundation) {
    case "pile_screw":
    case "pile_grillage":
      return screwPile(input, geo);
    case "strip":
      return stripFoundation(geo);
    case "slab_200":
      return slabFoundation(geo, 200);
    case "slab_300":
      return slabFoundation(geo, 300);
    default:
      return [];
  }
}

// ─────────── Свайно-винтовой ───────────

function screwPile(input: BuildingInput, geo: Geometry): LineItem[] {
  const lines: LineItem[] = [];

  // Подбор плотности свай по типу нагрузки
  const isLoaded = (input.craneCapacityT ?? 0) > 0 || input.frame === "metal";
  const isSwelling = input.soilType === "swelling" || input.soilType === "clay";

  const density = isSwelling
    ? FOUNDATION_NORMS.screw_pile_density_per_m2.swelling
    : isLoaded
      ? FOUNDATION_NORMS.screw_pile_density_per_m2.loaded
      : FOUNDATION_NORMS.screw_pile_density_per_m2.standard;

  const piles = ceil(geo.floorArea * density);
  const pileUnit = isLoaded ? FOUNDATION.screw_pile_133_3000 : FOUNDATION.screw_pile_108_2500;
  const pileName = isLoaded ? "Свая винтовая Ø133, L=3000 мм" : "Свая винтовая Ø108, L=2500 мм";

  lines.push({
    category: "material", group: "foundation",
    name: pileName,
    quantity: piles,
    unit: "шт",
    unitPrice: pileUnit,
    total: round(piles * pileUnit),
    note: `1 свая на ${(1 / density).toFixed(1)} м² пятна`,
  });

  // Обвязка (швеллер) — для свайно-ростверкового
  if (input.foundation === "pile_grillage") {
    const beamLength = geo.perimeter * 1.05; // запас 5%
    const beamMassKg = beamLength * 17; // швеллер 16П = 14.2 кг/м, берём 17 с запасом
    const beamMassT = round(beamMassKg / 1000, 2);
    lines.push({
      category: "material", group: "foundation",
      name: "Швеллер 16П для ростверка",
      quantity: beamMassT,
      unit: "т",
      unitPrice: 92000,
      total: round(beamMassT * 92000),
    });
    lines.push({
      category: "work", group: "foundation",
      name: "Сварка ростверка по сваям",
      quantity: beamMassT,
      unit: "т",
      unitPrice: 12000,
      total: round(beamMassT * 12000),
    });
  }

  // Работа — монтаж свай
  lines.push({
    category: "work", group: "foundation",
    name: "Завинчивание винтовых свай",
    quantity: piles,
    unit: "шт",
    unitPrice: WORKS.pile_screw_per_pile,
    total: round(piles * WORKS.pile_screw_per_pile),
  });

  return lines;
}

// ─────────── Ленточный фундамент ───────────

function stripFoundation(geo: Geometry): LineItem[] {
  const lines: LineItem[] = [];
  const L = geo.perimeter;
  const norms = FOUNDATION_NORMS.strip_section_400x800;

  // Бетон
  const concreteM3 = round(L * norms.concrete_m3_per_m, 1);
  lines.push({
    category: "material", group: "foundation",
    name: "Бетон М300 (товарный, с доставкой)",
    quantity: concreteM3,
    unit: "м³",
    unitPrice: FOUNDATION.concrete_M300_per_m3,
    total: round(concreteM3 * FOUNDATION.concrete_M300_per_m3),
    note: `Лента 400×800 мм по периметру ${L.toFixed(0)} м`,
  });

  // Арматура
  const rebarT = round((concreteM3 * norms.rebar_kg_per_m3) / 1000, 2);
  lines.push({
    category: "material", group: "foundation",
    name: "Арматура А500 Ø12 + Ø8 (двойной каркас)",
    quantity: rebarT,
    unit: "т",
    unitPrice: FOUNDATION.rebar_per_ton,
    total: round(rebarT * FOUNDATION.rebar_per_ton),
    note: "200 кг/м³ — двойной арматурный каркас",
  });

  // Опалубка
  const formworkM2 = round(L * norms.formwork_m2_per_m, 0);
  lines.push({
    category: "material", group: "foundation",
    name: "Опалубка щитовая (фанера + брус)",
    quantity: formworkM2,
    unit: "м²",
    unitPrice: FOUNDATION.formwork_per_m2,
    total: round(formworkM2 * FOUNDATION.formwork_per_m2),
  });

  // Работы
  lines.push({
    category: "work", group: "foundation",
    name: "Земляные работы (траншея под ленту)",
    quantity: round(L, 0),
    unit: "м.п.",
    unitPrice: 800,
    total: round(L * 800),
  });

  lines.push({
    category: "work", group: "foundation",
    name: "Армирование (вязка каркасов)",
    quantity: rebarT,
    unit: "т",
    unitPrice: WORKS.rebar_assembly_per_ton,
    total: round(rebarT * WORKS.rebar_assembly_per_ton),
  });

  lines.push({
    category: "work", group: "foundation",
    name: "Монтаж опалубки",
    quantity: formworkM2,
    unit: "м²",
    unitPrice: WORKS.formwork_per_m2_work,
    total: round(formworkM2 * WORKS.formwork_per_m2_work),
  });

  lines.push({
    category: "work", group: "foundation",
    name: "Заливка бетона + уплотнение",
    quantity: concreteM3,
    unit: "м³",
    unitPrice: WORKS.concrete_strip_per_m3,
    total: round(concreteM3 * WORKS.concrete_strip_per_m3),
  });

  return lines;
}

// ─────────── Монолитная плита ───────────

function slabFoundation(geo: Geometry, thickness: 200 | 300): LineItem[] {
  const lines: LineItem[] = [];
  const A = geo.floorArea;
  const norms = thickness === 200 ? FOUNDATION_NORMS.slab_200_norms : FOUNDATION_NORMS.slab_300_norms;

  const concreteM3 = round(A * norms.concrete_m3_per_m2, 1);
  lines.push({
    category: "material", group: "foundation",
    name: `Бетон М300 (плита ${thickness} мм)`,
    quantity: concreteM3,
    unit: "м³",
    unitPrice: FOUNDATION.concrete_M300_per_m3,
    total: round(concreteM3 * FOUNDATION.concrete_M300_per_m3),
  });

  const rebarT = round((A * norms.rebar_kg_per_m2) / 1000, 2);
  lines.push({
    category: "material", group: "foundation",
    name: "Арматура А500 Ø12 (двойная сетка)",
    quantity: rebarT,
    unit: "т",
    unitPrice: FOUNDATION.rebar_per_ton,
    total: round(rebarT * FOUNDATION.rebar_per_ton),
  });

  // Работы
  lines.push({
    category: "work", group: "foundation",
    name: "Подготовка основания + опалубка по периметру",
    quantity: round(A, 0),
    unit: "м²",
    unitPrice: 350,
    total: round(A * 350),
  });

  lines.push({
    category: "work", group: "foundation",
    name: "Армирование плиты",
    quantity: rebarT,
    unit: "т",
    unitPrice: WORKS.rebar_assembly_per_ton,
    total: round(rebarT * WORKS.rebar_assembly_per_ton),
  });

  lines.push({
    category: "work", group: "foundation",
    name: "Заливка плиты + затирка",
    quantity: round(A, 0),
    unit: "м²",
    unitPrice: WORKS.slab_concrete_per_m2,
    total: round(A * WORKS.slab_concrete_per_m2),
  });

  return lines;
}
