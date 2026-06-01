// Расчёт каркаса — расход металла + покрытия + работы
// Эмпирическая формула: масса = база(пролёт) × k_снег × k_сейсм × k_высота × надбавки

import type { BuildingInput, LineItem } from "../types";
import type { Geometry } from "../geometry";
import { round } from "../geometry";
import { METAL, WORKS } from "../catalog";
import { FRAME_NORMS } from "../consumption";

export function calculateFrame(input: BuildingInput, geo: Geometry): LineItem[] {
  if (input.frame === "modular") return modularFrame(input, geo);
  if (input.frame === "lstk")    return lstkFrame(input, geo);
  if (input.frame === "metal")   return metalFrame(input, geo);
  return [];
}

// ─────────── Универсальный расчёт массы металла ───────────

function pickBaseKgM2(input: BuildingInput, geo: Geometry, table: Record<string, number>): number {
  const span = geo.spanM;
  // Линейная интерполяция между ближайшими значениями таблицы
  const keys = Object.keys(table).map(k => Number(k.replace("span_", "")));
  keys.sort((a, b) => a - b);

  if (span <= keys[0])  return table[`span_${keys[0]}`];
  if (span >= keys[keys.length - 1]) return table[`span_${keys[keys.length - 1]}`];

  for (let i = 0; i < keys.length - 1; i++) {
    if (span >= keys[i] && span < keys[i + 1]) {
      const x0 = keys[i], x1 = keys[i + 1];
      const y0 = table[`span_${x0}`], y1 = table[`span_${x1}`];
      return y0 + (y1 - y0) * (span - x0) / (x1 - x0);
    }
  }
  return table[`span_${keys[0]}`];
}

// Определение типа комплектации:
// - "cold"   — холодный (профлист стены+кровля, без утепления, без отопления)
// - "warm"   — тёплый (сэндвич стены или кровля, готовая коробка)
// - "turnkey" — под ключ (тёплый + отделка + инженерка)
export function detectInsulation(input: BuildingInput): "cold" | "warm" | "turnkey" {
  const isWallCold = input.cladding === "none" || input.cladding === "proflist";
  const isRoofCold = input.roofing === "proflist";
  if (isWallCold && isRoofCold) return "cold";
  return "warm"; // turnkey пока определяется опциями
}

function computeSteelMassKg(input: BuildingInput, geo: Geometry, type: "lstk" | "metal"): number {
  const table = type === "lstk" ? FRAME_NORMS.lstk_base_kg_per_m2 : FRAME_NORMS.metal_base_kg_per_m2;
  let kgPerM2 = pickBaseKgM2(input, geo, table);

  // Поправки
  const snowZone    = (input.snowZone    ?? 3) as keyof typeof FRAME_NORMS.k_snow_zone;
  const seismicLvl  = (input.seismicLevel ?? 6) as keyof typeof FRAME_NORMS.k_seismic;
  kgPerM2 *= FRAME_NORMS.k_snow_zone[snowZone] ?? 1.0;
  kgPerM2 *= FRAME_NORMS.k_seismic[seismicLvl]  ?? 1.0;

  // Высота сверх 6м
  if (input.height > 6) {
    kgPerM2 *= 1 + (input.height - 6) * FRAME_NORMS.k_height;
  }

  // Кран — нелинейный рост: подкрановые балки + усиленные колонны + тормозные фермы
  // Кран 5т → +50%, 10т → +100%, 20т → +165%
  const craneT = input.craneCapacityT ?? 0;
  if (craneT > 0) {
    kgPerM2 *= 1 + craneT * 0.07 + (craneT >= 10 ? 0.35 : 0) + (craneT >= 20 ? 0.30 : 0);
  }

  // Многопролётность — экономия на промежуточных колоннах (по СП 16.13330)
  // 2 пролёта −5%, 3 −8%, 4+ −12%
  const spans = input.spanCount ?? 1;
  if (spans === 2)      kgPerM2 *= 0.95;
  else if (spans === 3) kgPerM2 *= 0.92;
  else if (spans >= 4)  kgPerM2 *= 0.88;

  // Холодный ангар — лёгкие конструкции (гнутый профиль / прямостен лёгкий)
  // Расход металла на 35-45% ниже чем у тёплого
  if (detectInsulation(input) === "cold") {
    kgPerM2 *= 0.60;
  }

  // Надбавки на швы и КМД
  kgPerM2 *= 1 + FRAME_NORMS.weld_extra_pct + FRAME_NORMS.kmd_correction_pct;

  // Запас на отходы
  kgPerM2 *= 1 + FRAME_NORMS.waste_pct;

  return kgPerM2 * geo.floorArea;
}

// ─────────── ЛСТК ───────────

function lstkFrame(input: BuildingInput, geo: Geometry): LineItem[] {
  const lines: LineItem[] = [];
  const massKg = computeSteelMassKg(input, geo, "lstk");
  const massT = round(massKg / 1000, 2);

  lines.push({
    category: "material", group: "frame",
    name: "Профиль ЛСТК (C/П-профиль, оцинкованный)",
    quantity: massT,
    unit: "т",
    unitPrice: METAL.lstk_profile_per_ton,
    total: round(massT * METAL.lstk_profile_per_ton),
    note: `Расчётный расход: ${round(massKg / geo.floorArea, 1)} кг/м² пятна`,
  });

  // Покраска не нужна для оцинковки

  lines.push({
    category: "work", group: "frame",
    name: "Сборка/монтаж каркаса ЛСТК",
    quantity: massT,
    unit: "т",
    unitPrice: WORKS.lstk_assembly_per_ton,
    total: round(massT * WORKS.lstk_assembly_per_ton),
  });

  return lines;
}

// ─────────── Металлокаркас (чёрный прокат) ───────────

function metalFrame(input: BuildingInput, geo: Geometry): LineItem[] {
  const lines: LineItem[] = [];
  const massKg = computeSteelMassKg(input, geo, "metal");
  const massT = round(massKg / 1000, 2);

  lines.push({
    category: "material", group: "frame",
    name: "Двутавр / швеллер (по проекту КМ)",
    quantity: massT,
    unit: "т",
    unitPrice: METAL.iBeam_per_ton,
    total: round(massT * METAL.iBeam_per_ton),
    note: `Расчётный расход: ${round(massKg / geo.floorArea, 1)} кг/м² пятна`,
  });

  // Грунтовка + эмаль (расход кг на тонну металла)
  const paintKg = round(massT * FRAME_NORMS.paint_kg_per_ton, 0);
  lines.push({
    category: "material", group: "frame",
    name: "Грунт + эмаль ПФ-115 RAL 7016",
    quantity: paintKg,
    unit: "кг",
    unitPrice: 250,
    total: round(paintKg * 250),
  });

  // Работы
  lines.push({
    category: "work", group: "frame",
    name: "Изготовление металлоконструкций",
    quantity: massT,
    unit: "т",
    unitPrice: WORKS.metal_welding_per_ton,
    total: round(massT * WORKS.metal_welding_per_ton),
    note: "Сварочные работы на базе",
  });

  lines.push({
    category: "work", group: "frame",
    name: "Покраска металлоконструкций",
    quantity: massT,
    unit: "т",
    unitPrice: WORKS.metal_painting_per_ton,
    total: round(massT * WORKS.metal_painting_per_ton),
  });

  lines.push({
    category: "work", group: "frame",
    name: "Монтаж МК на объекте",
    quantity: massT,
    unit: "т",
    unitPrice: WORKS.metal_assembly_per_ton,
    total: round(massT * WORKS.metal_assembly_per_ton),
  });

  return lines;
}

// ─────────── Модульное здание ───────────

function modularFrame(input: BuildingInput, geo: Geometry): LineItem[] {
  // Для модульных — упрощённо считаем за м² готового блока
  const A = geo.floorArea;
  return [
    {
      category: "material", group: "frame",
      name: "Модульный блок-контейнер с утеплением (под ключ)",
      quantity: round(A, 1),
      unit: "м²",
      unitPrice: 38000,
      total: round(A * 38000),
      note: "Блок-модуль с каркасом, стенами, утеплением, отделкой",
    },
  ];
}
