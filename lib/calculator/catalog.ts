// АЗИМЕР — Каталог цен (placeholder из рыночного исследования)
// ЗАМЕНЯЕТСЯ когда придут реальные цены от поставщиков Азамата
// Все цены — РОЗНИЧНЫЕ от поставщиков (без наценки Азамата).
// Наценка добавляется в overhead.ts (МДС 81-33) + margin компании.

export const CATALOG_VERSION = "v1-market-baseline-2026-05";

// ────────────────── СЭНДВИЧ-ПАНЕЛИ ──────────────────
// ₽/м² по толщинам — RAL 9003 (стандартный белый)
// Источник: rsb96.ru / sibzsm.ru / КП Азамата от 20.05.2026

export const SANDWICH = {
  wall_minvata: {
    50:  2200,
    80:  2500,
    100: 2700,
    120: 2900,
    150: 3030,   // ← из реального прайса Азамата
    200: 3700,
    250: 4100,
  },
  wall_pir: {
    50:  2400,
    100: 3145,
    120: 3500,
    150: 3886,
    200: 4500,
  },
  roof_minvata: {
    100: 2900,
    120: 3100,
    150: 3331,   // ← из реального прайса Азамата
    200: 4000,
    250: 4300,
  },
  roof_pir: {
    100: 3330,
    120: 3500,
    150: 4000,
    200: 4600,
  },
} as const;

// ────────────────── ПРОФЛИСТ ──────────────────
// ₽/м² (оцинковка / крашеный RAL)

export const PROFLIST = {
  wall_zinc:    450,
  wall_painted: 550,
  roof_zinc:    550,
  roof_painted: 650,
} as const;

// ────────────────── ФАСОННЫЕ ЭЛЕМЕНТЫ / ДОБОРКА ──────────────────

export const TRIM = {
  edge_painted_per_m2: 1056,   // фасонные элементы RAL 7004 (из прайса Азамата)
  edge_zinc_per_m2:    750,
  flashing_per_m:      400,    // нащельники, отливы (₽/м.п.)
  ridge_per_m:         550,    // конёк
  valley_per_m:        500,    // ендова
} as const;

// ────────────────── КРЕПЁЖ И РАСХОДНИКИ ──────────────────

export const HARDWARE = {
  // Саморезы (₽/шт) — из прайса Азамата
  screw_sandwich_135:   28,    // для сэндвич 100мм
  screw_sandwich_185:   33.6,  // для сэндвич 150мм
  screw_sandwich_235:   42,    // для сэндвич 200мм
  screw_roof_19_zinc:   5,
  screw_roof_19_RAL:    6.55,
  screw_roof_35_RAL:    8,
  screw_roof_60_RAL:    12,
  rivet_4x10:           2.5,

  // Расходники
  sealant_silicone_tube: 264,  // 310 мл туба
  foam_summer_can:       607,  // 750 мл баллон
  foam_winter_can:       750,
  tape_seal_per_m:       360,  // лента уплотнительная
  electrode_kg:          250,
} as const;

// ────────────────── МЕТАЛЛОПРОКАТ ──────────────────
// ₽/тонна на 2026-05 — средние по рынку

export const METAL = {
  iBeam_per_ton:        95000,   // двутавр
  channel_per_ton:      92000,   // швеллер
  angle_per_ton:        88000,   // уголок равнополочный
  square_pipe_per_ton:  100000,  // профтруба
  sheet_hr_per_ton:     85000,   // лист горячекатаный
  lstk_profile_per_ton: 145000,  // ЛСТК С/П-профиль

  // Расходные материалы
  paint_per_ton_metal:  8000,    // грунт + эмаль на 1 т МК
} as const;

// ────────────────── ФУНДАМЕНТ ──────────────────

export const FOUNDATION = {
  // Свайно-винтовой
  screw_pile_89_2500:    5500,   // ₽/шт под ключ (с обвязкой)
  screw_pile_108_2500:   6500,
  screw_pile_108_3000:   7800,
  screw_pile_133_3000:   9500,

  // Ленточный
  concrete_M300_per_m3:  6500,   // бетон М300
  rebar_per_ton:         60000,  // арматура А500
  formwork_per_m2:       350,    // опалубка (работа)
  strip_per_m_linear:    4500,   // под ключ ₽/м.п. (типовая 400×800)

  // Плита
  slab_200_per_m2:       6500,   // под ключ
  slab_300_per_m2:       9500,
} as const;

// ────────────────── ДОБОРНЫЕ ─ за штуку, под ключ ──────────────────

export const OPENINGS = {
  // Ворота секционные
  gate_section_3x3:   90000,
  gate_section_4x4:   180000,
  gate_section_5x5:   280000,
  gate_section_6x6:   380000,

  // Ворота распашные
  gate_swing_3x3:     25000,
  gate_swing_4x3:     32000,

  // Окна ПВХ
  window_1200x1500:   14000,
  window_1500x2000:   22000,
  window_1800x1800:   24000,

  // Двери
  door_metal_900:     18000,
  door_tech_900:      12000,
  door_fire_EI60_900: 24000,
  door_fire_EI60_1200: 36000,
} as const;

// ────────────────── РАСЦЕНКИ НА РАБОТЫ ──────────────────
// ₽ за единицу. Включают только труд+мехчасы, без материала.
// Накладные и сметная прибыль добавляются в overhead.ts

export const WORKS = {
  // Каркас
  metal_assembly_per_ton:   20000,  // монтаж МК на объекте
  metal_welding_per_ton:    8000,   // сварочные работы
  metal_painting_per_ton:   4000,   // покраска МК
  lstk_assembly_per_ton:    18000,

  // Стены
  sandwich_wall_per_m2:     700,    // монтаж сэндвич-стен
  proflist_wall_per_m2:     350,    // монтаж профлиста
  sealant_work_per_m:       150,    // герметизация швов

  // Кровля
  sandwich_roof_per_m2:     770,
  proflist_roof_per_m2:     400,

  // Фундамент
  pile_screw_per_pile:      2500,   // монтаж 1 сваи
  concrete_strip_per_m3:    3500,   // работа по бетону ленты
  slab_concrete_per_m2:     800,    // заливка плиты
  formwork_per_m2_work:     250,
  rebar_assembly_per_ton:   12000,

  // Доборные (монтаж на объекте)
  gate_mount_each:          8000,
  window_mount_each:        3000,
  door_mount_each:          2500,
} as const;

// ────────────────── ЛОГИСТИКА ──────────────────
// Фиксированные суммы по направлениям (включает 1 фуру материалов).
// Для крупных объектов умножаем на число фур.

export const LOGISTICS = {
  krasnoyarsk:  { fixed: 0,      per_km: 0  },  // в Красноярск включено
  hakasia:      { fixed: 200000, per_km: 0  },  // Абакан, Черногорск
  kemerovo:     { fixed: 250000, per_km: 0  },
  irkutsk:      { fixed: 350000, per_km: 0  },
  altai:        { fixed: 280000, per_km: 0  },  // Барнаул, Бийск
  other:        { fixed: 0,      per_km: 80 },  // вычисляем по км
} as const;

// ────────────────── ВНУТРЕННИЕ РАБОТЫ (опционально) ──────────────────

export const INTERIOR = {
  electric_econom_per_m2:    200,
  electric_standard_per_m2:  400,
  electric_premium_per_m2:   750,
  heating_electric_per_m2:   950,
  heating_gas_per_m2:        1200,
  heating_solid_per_m2:      1100,
  warm_floor_per_m2:         850,
  ventilation_supply_per_m2: 600,
  floor_concrete_per_m2:     550,
  floor_industrial_per_m2:   1100,
  fire_alarm_per_object:     35000,
} as const;

// ────────────────── ФИНАНСЫ ──────────────────

export const FINANCE = {
  loss_factor: 1.05,        // 5% запас на отход (материалы)

  // НР и СП по МДС 81-33.2004 (ред. 812/пр от 21.12.2020)
  overhead_pct_of_FOT: 1.06, // 106% от ФОТ для промстроительства
  profit_pct_of_FOT:   0.65, // 65% сметная прибыль

  // Маржа компании (запас на колебания цен, оргзатраты)
  company_margin_pct:  0.15,

  // Наценка клиенту поверх себестоимости
  client_markup_pct:   0.20, // 20% — по подтверждению Азамата

  // Доля ФОТ в работах (для расчёта НР+СП от ФОТ)
  fot_share_of_works:  0.60, // ~60% работ — это зарплата
} as const;
