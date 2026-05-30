// АЗИМЕР — геометрия здания
// Считает площади, периметры, поправки на уклон, объём

import type { BuildingInput } from "./types";

export interface Geometry {
  floorArea:   number;   // м² пятна застройки
  wallArea:    number;   // м² стен (с учётом высоты)
  roofArea:    number;   // м² кровли (с уклоном)
  perimeter:   number;   // м.п. периметр
  volume:      number;   // м³ внутреннего объёма
  spanM:       number;   // м реальный пролёт (с учётом кол-ва пролётов)
}

// Коэффициент уклона кровли: для типовой двускатной 10° дополнительно ~+2%
const ROOF_SLOPE_FACTOR = 1.05;  // 5% запас на уклон

export function computeGeometry(input: BuildingInput): Geometry {
  const L = Math.max(0, input.length);
  const W = Math.max(0, input.width);
  const H = Math.max(0, input.height);
  const spanCount = Math.max(1, input.spanCount ?? 1);

  const floorArea = L * W;
  const perimeter = 2 * (L + W);
  const wallArea  = perimeter * H;
  const roofArea  = floorArea * ROOF_SLOPE_FACTOR;
  const volume    = floorArea * H;

  // Реальный пролёт между колоннами
  // Если spanCount > 1 — пролёт = ширина/spanCount (промежуточные колонны делят)
  const spanM = W / spanCount;

  return { floorArea, wallArea, roofArea, perimeter, volume, spanM };
}

// Утилиты
export const round = (n: number, p = 0) => {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
};

export const ceil = (n: number) => Math.ceil(n);

// Парсинг строки размера: "4x4" / "1500x2000" → [a, b]
export function parseSize(size: string): [number, number] | null {
  const m = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*[x×х]\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}
