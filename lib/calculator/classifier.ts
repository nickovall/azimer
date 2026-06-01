// АЗИМЕР — классификатор сложности объекта
// Определяет: типовой / расширенный / нужен инженер

import type { BuildingInput, Complexity, ComplexityFlag } from "./types";
import { getRegion } from "./regions";

export interface Classification {
  complexity: Complexity;
  flags:      ComplexityFlag[];
  reasons:    string[];        // человеко-читаемые описания
}

// Какие флаги считаются "блокерами" — сразу требуется инженер
const BLOCKING_FLAGS: ComplexityFlag[] = [
  "non_rectangular",   // Г/U-образное — нужен индивидуальный расчёт узлов
  "overhead_crane",    // крановые нагрузки считаются по паспорту крана и группе режима
  "extreme_snow",      // VI+ зона
  "high_seismic",      // 8+ баллов
  "permafrost",        // мерзлота — только после геологии/оснований
  "tall_rack",         // стеллажи > 10м — особый расчёт пола и нагрузок
];

export function classify(input: BuildingInput): Classification {
  const flags: ComplexityFlag[] = [];
  const reasons: string[] = [];
  const region = getRegion(input.region);

  // Пролёт — если ширина больше 12м И только 1 пролёт
  const spanCount = input.spanCount ?? 1;
  const realSpan = input.width / spanCount;
  if (realSpan > 12) {
    flags.push("large_span");
    reasons.push(`Большой пролёт ${realSpan.toFixed(1)}м (>12м) — нелинейный рост металлоёмкости`);
  }

  // Многопролётность
  if (spanCount > 1) {
    flags.push("multi_span");
    reasons.push(`${spanCount} пролёта — промежуточные колонны, доп. узлы`);
  }

  // Мостовой кран
  if ((input.craneCapacityT ?? 0) > 0) {
    flags.push("overhead_crane");
    reasons.push(`Мостовой кран ${input.craneCapacityT}т — подкрановые балки, усиление колонн`);
  }

  // Антресоль
  if (input.hasMezzanine) {
    flags.push("mezzanine");
    reasons.push(`Антресоль ${input.mezzanineAreaM2 ?? "?"}м² — доп. перекрытие, балки`);
  }

  // Форма плана
  if (input.planShape && input.planShape !== "rectangle") {
    flags.push("non_rectangular");
    reasons.push(`План ${input.planShape} — нестандартные узлы сопряжения`);
  }

  // Большой шаг колонн
  if ((input.columnStepM ?? 6) > 6) {
    flags.push("large_column_step");
    reasons.push(`Шаг колонн ${input.columnStepM}м — более мощные прогоны/фермы`);
  }

  // Высокие стены
  if (input.height > 10) {
    flags.push("high_walls");
    reasons.push(`Высота карниза ${input.height}м (>10м)`);
  }

  // Экстремальный снег: север края и точечные значения табл. К.1 СП 20.
  const snowLoadKPa = input.snowLoadKPa ?? region.snowLoadKPa;
  if ((input.snowZone ?? region.snowZone) >= 6 || snowLoadKPa >= 2.4) {
    flags.push("extreme_snow");
    reasons.push(`Снеговая нагрузка Sg ${snowLoadKPa.toFixed(2)} кПа — нужна проверка КМ`);
  }

  // Сейсмика
  if ((input.seismicLevel ?? 6) >= 7) {
    flags.push("seismic");
    reasons.push(`Сейсмика ${input.seismicLevel} баллов — специальные узлы`);
  }
  if ((input.seismicLevel ?? 6) >= 8) {
    flags.push("high_seismic");
    reasons.push(`Сейсмика ${input.seismicLevel} баллов — нужен расчёт по СП 14`);
  }

  if (region.permafrost) {
    flags.push("permafrost");
    reasons.push("Вечная мерзлота — фундамент только по геологии и теплотехнике грунтов");
  }

  // Толстое утепление
  const claddingThk = input.claddingThk ?? 150;
  if (claddingThk >= 200) {
    flags.push("heavy_insulation");
    reasons.push(`Сэндвич ${claddingThk}мм — большая масса ограждения`);
  }

  // Высокие стеллажи
  if ((input.rackHeightM ?? 0) > 6) {
    flags.push("tall_rack");
    reasons.push(`Стеллажи ${input.rackHeightM}м — особый расчёт пола и каркаса`);
  }

  // ─── Решение по сложности ───

  // Если есть хотя бы один блокирующий флаг — нужен инженер
  const hasBlocker = flags.some(f => BLOCKING_FLAGS.includes(f));
  if (hasBlocker) {
    return { complexity: "ENGINEER_REQUIRED", flags, reasons };
  }

  // Если >= 3 флагов — расчёт ненадёжен, нужен инженер
  if (flags.length >= 3) {
    return { complexity: "ENGINEER_REQUIRED", flags, reasons };
  }

  // 1-2 флага — расширенный режим, считаем но с большей погрешностью
  if (flags.length >= 1) {
    return { complexity: "EXTENDED", flags, reasons };
  }

  // Иначе — типовой
  return { complexity: "TYPICAL", flags: [], reasons: [] };
}
