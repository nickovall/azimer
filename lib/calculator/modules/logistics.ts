// Расчёт логистики — доставка материалов до объекта

import type { BuildingInput, LineItem } from "../types";
import { round } from "../geometry";
import { LOGISTICS } from "../catalog";

export function calculateLogistics(input: BuildingInput): LineItem[] {
  if (!input.logisticsAdd || !input.logisticsDest) return [];

  const dest = LOGISTICS[input.logisticsDest];
  if (!dest || dest.fixed === 0) return [];

  return [{
    category: "logistics", group: "logistics",
    name: `Доставка материалов: ${labelFor(input.logisticsDest)}`,
    quantity: 1,
    unit: "комплект",
    unitPrice: dest.fixed,
    total: dest.fixed,
    note: "Стандартная фура. При большом объёме умножается на число рейсов.",
  }];
}

function labelFor(dest: string): string {
  return ({
    krasnoyarsk: "Красноярск + пригороды",
    hakasia:     "Хакасия (Абакан, Черногорск)",
    kemerovo:    "Кемерово, Новокузнецк",
    irkutsk:     "Иркутск, Ангарск",
    altai:       "Алтай (Барнаул, Бийск)",
    other:       "Другое направление",
  } as Record<string, string>)[dest] ?? dest;
}
