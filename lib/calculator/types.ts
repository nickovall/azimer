// АЗИМЕР — типы инженерного калькулятора v2
// Архитектура: слоистая (engine ↔ catalog ↔ data ↔ output)

// ────────────────── ВХОД (что вводит клиент/Азамат) ──────────────────

export type ObjectType =
  | "sklad" | "angar" | "production" | "commercial" | "naves" | "modular" | "residential"
  | "tent_arched";  // эконом-линейка: арочный тент-каркас

export type FrameType = "lstk" | "metal" | "modular";

export type CladdingType = "none" | "proflist" | "sandwich_minvata" | "sandwich_pir";

export type CladdingThickness = 50 | 80 | 100 | 120 | 150 | 200 | 250;

export type RoofingType = "proflist" | "sandwich_minvata" | "sandwich_pir";

export type FoundationType = "none" | "pile_screw" | "pile_grillage" | "strip" | "slab_200" | "slab_300";

export type SoilType = "sand" | "loam" | "clay" | "rocky" | "swelling";

export type LogisticsDest = "krasnoyarsk" | "hakasia" | "kemerovo" | "irkutsk" | "altai" | "other";

export type PlanShape = "rectangle" | "L_shape" | "U_shape" | "custom";

export interface BuildingInput {
  // География (определяет снег/ветер/сейсмику/мерзлоту/зимнюю надбавку)
  // ID из lib/calculator/regions.ts. Default = "krsk_city"
  region?:      string;

  // Базовые параметры (Wizard уровень 1)
  objectType:   ObjectType;
  length:       number;             // м
  width:        number;             // м
  height:       number;             // м (высота карниза)
  frame:        FrameType;
  cladding:     CladdingType;
  claddingThk?: CladdingThickness;  // мм; default 150
  roofing:      RoofingType;
  roofingThk?:  CladdingThickness;  // мм; default 150
  foundation:   FoundationType;

  // Доборные (уровень 1)
  gates:    Array<{ size: string; count: number }>;
  windows:  Array<{ size: string; count: number }>;
  doors:    { count: number };

  // Логистика
  logisticsAdd?:  boolean;
  logisticsDest?: LogisticsDest;

  // ────────── Расширенные параметры (Wizard уровень 2 — для нестандарта)
  spanCount?:        number;         // число пролётов между колоннами (default 1)
  columnStepM?:      number;         // шаг рам каркаса вдоль здания (default 6)
  craneCapacityT?:   number;         // грузоподъёмность мостового крана (т)
  hasMezzanine?:     boolean;
  mezzanineAreaM2?:  number;
  planShape?:        PlanShape;      // default 'rectangle'
  rackHeightM?:      number;         // высота стеллажей (если склад)

  // Регион / климат (default Красноярск)
  snowZone?:    1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;  // СП 20.13330: для Красноярска = III (тут 3)
  windZone?:    1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;  // для Красноярска = III
  seismicLevel?: 5 | 6 | 7 | 8 | 9;             // баллы
  soilType?:    SoilType;

  // Прочее
  notes?: string;
}

// ────────────────── ВЫХОД (что движок возвращает) ──────────────────

export type LineCategory = "material" | "work" | "logistics" | "overhead";
export type LineGroup    = "frame" | "walls" | "roof" | "foundation" | "openings" | "logistics" | "overhead";

export interface LineItem {
  category:    LineCategory;
  group:       LineGroup;
  name:        string;
  quantity:    number;
  unit:        string;        // "м²" | "шт" | "м.п." | "т" | "м³" | "туба" | "балл."
  unitPrice:   number;        // ₽
  total:       number;        // quantity × unitPrice
  source?:     string;        // комментарий (поставщик / норматив)
  note?:       string;        // пояснение для КП
}

export interface EstimateTotals {
  materials:    number;
  works:        number;
  logistics:    number;
  direct:       number;       // materials + works + logistics
  overhead:     number;       // НР (МДС 81-33)
  profit:       number;       // СП (МДС 81-25)
  margin:       number;       // запас компании
  beforeMarkup: number;       // direct + overhead + profit + margin
  markup:       number;       // 20% наценка клиенту
  final:        number;       // итоговая цена для клиента
  low:          number;       // -10%
  high:         number;       // +15%
}

export type ComplexityFlag =
  | "large_span"          // пролёт > 12м
  | "multi_span"          // несколько пролётов
  | "overhead_crane"      // мостовой кран
  | "mezzanine"           // антресоль
  | "non_rectangular"    // Г/U-образное
  | "large_column_step"  // шаг колонн > 6м
  | "high_walls"          // высота > 10м
  | "extreme_snow"        // снег > 240 кг/м² (VI+)
  | "seismic"             // 7+ баллов
  | "heavy_insulation"   // сэндвич > 200мм
  | "tall_rack";          // стеллажи > 6м

export type Complexity = "TYPICAL" | "EXTENDED" | "ENGINEER_REQUIRED";

export interface Estimate {
  // Входные данные (для трейсабилити)
  input: BuildingInput;

  // Классификация
  complexity: Complexity;
  flags:      ComplexityFlag[];

  // Геометрия
  metadata: {
    floorArea:   number;       // м² пятна застройки
    wallArea:    number;       // м² стен
    roofArea:    number;       // м² кровли (с уклоном)
    perimeter:   number;       // м.п.
    volume:      number;       // м³ внутреннего объёма
  };

  // Спецификация позиций
  lines: LineItem[];

  // Итоги
  totals: EstimateTotals;

  // Метаинформация (для версионирования)
  catalogVersion?: string;
  calculatedAt:    string;     // ISO timestamp
}
