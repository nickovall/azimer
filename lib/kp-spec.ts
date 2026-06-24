// Редактируемая смета КП — общий слой для админ-редактора и публичной /kp.
// Модель «Полная смета вручную»: движок генерит черновик строк с клиентскими
// ценами, менеджер правит свободно, итог КП = сумма строк.

import type { Estimate } from "./calculator/types";
import { groupLabel } from "./calculator";

export interface KpSpecLine {
  id: string;
  group: string;                 // LineGroup ключ (frame/walls/...) или "custom"
  name: string;
  note?: string;
  quantity: number;
  unit: string;
  total: number;                 // ₽ — итог по строке (клиентская цена, с наценкой)
  category: "material" | "work";
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const rid = () => Math.random().toString(36).slice(2, 8);

// Черновик сметы из расчёта движка. Цены по строкам — КЛИЕНТСКИЕ:
// распределяем НР/СП/маржу/наценку пропорционально (mul = final / direct),
// ровно как делает /kp при показе групповых итогов.
export function buildDraftSpec(est: Estimate): KpSpecLine[] {
  const directSum = est.lines.reduce((s, l) => s + l.total, 0);
  const mul = directSum > 0 ? est.totals.final / directSum : 1;
  return est.lines.map((l) => ({
    id: rid(),
    group: l.group,
    name: l.name,
    note: l.note,
    quantity: round2(l.quantity),
    unit: l.unit,
    total: Math.round(l.total * mul),
    category: l.category === "work" ? "work" : "material",
  }));
}

export function specTotal(spec: KpSpecLine[]): number {
  return spec.reduce((s, l) => s + (Number(l.total) || 0), 0);
}

export function groupSpec(spec: KpSpecLine[]): Record<string, KpSpecLine[]> {
  const out: Record<string, KpSpecLine[]> = {};
  for (const l of spec) {
    (out[l.group] ??= []).push(l);
  }
  return out;
}

export function specGroupLabel(group: string): string {
  return group === "custom" ? "➕  Дополнительно" : groupLabel(group);
}

// Разбивка материалы/работы из строк (для блока «Итого» в /kp).
export function specSplit(spec: KpSpecLine[]): { materials: number; works: number } {
  let materials = 0, works = 0;
  for (const l of spec) {
    if (l.category === "work") works += Number(l.total) || 0;
    else materials += Number(l.total) || 0;
  }
  return { materials, works };
}

export const SPEC_GROUP_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "frame", label: "Каркас" },
  { id: "walls", label: "Стены" },
  { id: "roof", label: "Кровля" },
  { id: "foundation", label: "Фундамент" },
  { id: "openings", label: "Доборные" },
  { id: "logistics", label: "Логистика" },
  { id: "custom", label: "Дополнительно" },
];

export function blankSpecLine(group = "custom"): KpSpecLine {
  return { id: rid(), group, name: "", quantity: 1, unit: "шт", total: 0, category: "material" };
}

// Валидатор для данных из payload /kp (источник недоверенный — base64 в URL).
export function isSpecArray(v: unknown): v is KpSpecLine[] {
  return Array.isArray(v) && v.length > 0 && v.every(
    (l) => l && typeof l === "object" && typeof (l as KpSpecLine).name === "string"
      && typeof (l as KpSpecLine).total === "number",
  );
}
