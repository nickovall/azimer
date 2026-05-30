// Расчёт доборных — ворота / окна / двери (поштучно)

import type { BuildingInput, LineItem } from "../types";
import { round } from "../geometry";
import { OPENINGS, WORKS } from "../catalog";
import { parseSize } from "../geometry";

export function calculateOpenings(input: BuildingInput): LineItem[] {
  const lines: LineItem[] = [];

  // ────────── Ворота ──────────
  for (const g of input.gates ?? []) {
    const [w, h] = parseSize(g.size) ?? [4, 4];
    const price = pickGatePrice(w, h);
    lines.push({
      category: "material", group: "openings",
      name: `Ворота секционные ${w}×${h} м (комплект)`,
      quantity: g.count,
      unit: "шт",
      unitPrice: price,
      total: round(g.count * price),
      note: "Полотно + направляющие + автоматика + комплектующие",
    });
    lines.push({
      category: "work", group: "openings",
      name: `Монтаж ворот ${w}×${h} м`,
      quantity: g.count,
      unit: "шт",
      unitPrice: WORKS.gate_mount_each,
      total: round(g.count * WORKS.gate_mount_each),
    });
  }

  // ────────── Окна ──────────
  for (const w of input.windows ?? []) {
    const [a, b] = parseSize(w.size) ?? [1500, 2000];
    const price = pickWindowPrice(a, b);
    lines.push({
      category: "material", group: "openings",
      name: `Окно ПВХ ${a}×${b} мм (двухкамерное)`,
      quantity: w.count,
      unit: "шт",
      unitPrice: price,
      total: round(w.count * price),
    });
    lines.push({
      category: "work", group: "openings",
      name: `Монтаж окон ${a}×${b}`,
      quantity: w.count,
      unit: "шт",
      unitPrice: WORKS.window_mount_each,
      total: round(w.count * WORKS.window_mount_each),
    });
  }

  // ────────── Двери ──────────
  const doorCount = input.doors?.count ?? 0;
  if (doorCount > 0) {
    lines.push({
      category: "material", group: "openings",
      name: "Дверь металлическая входная 900×2100",
      quantity: doorCount,
      unit: "шт",
      unitPrice: OPENINGS.door_metal_900,
      total: round(doorCount * OPENINGS.door_metal_900),
    });
    lines.push({
      category: "work", group: "openings",
      name: "Монтаж дверей",
      quantity: doorCount,
      unit: "шт",
      unitPrice: WORKS.door_mount_each,
      total: round(doorCount * WORKS.door_mount_each),
    });
  }

  return lines;
}

// ────────── Цены по размеру ──────────

function pickGatePrice(w: number, h: number): number {
  // Размер в "м" (4, 5, 6) или в "мм" (4000, 5000, 6000) — нормализуем
  const W = w > 100 ? w / 1000 : w;
  const H = h > 100 ? h / 1000 : h;
  const max = Math.max(W, H);

  if (max <= 3) return OPENINGS.gate_section_3x3;
  if (max <= 4) return OPENINGS.gate_section_4x4;
  if (max <= 5) return OPENINGS.gate_section_5x5;
  return OPENINGS.gate_section_6x6;
}

function pickWindowPrice(a: number, b: number): number {
  // По площади: до 1.8 м² — типовое 1200×1500, до 3 — 1500×2000, больше — 1800×1800
  const area_m2 = (a / 1000) * (b / 1000);
  if (area_m2 <= 1.8) return OPENINGS.window_1200x1500;
  if (area_m2 <= 3.0) return OPENINGS.window_1500x2000;
  return OPENINGS.window_1800x1800;
}
