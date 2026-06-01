// АЗИМЕР — публичный API калькулятора
export * from "./types";
export { calculate, groupLinesByGroup, groupLabel, formatRub } from "./engine";
export { classify } from "./classifier";
export { computeGeometry } from "./geometry";
export { CATALOG_VERSION } from "./catalog";
export { getRegion } from "./regions";
