// АЗИМЕР — База регионов строительства
// Включает параметры из СП 20.13330 (снег/ветер) и СНиП II-7-81 (сейсмика).
// Зимний коэффициент — эмпирика рынка (обогрев бетона, доплата за холод январь-март).

export type SnowZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type WindZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type SeismicLevel = 5 | 6 | 7 | 8 | 9;

export interface RegionParams {
  id:                 string;
  label:              string;       // как показывать в кнопке wizard
  cities:             string[];     // примеры населённых пунктов
  snowZone:           SnowZone;
  windZone:           WindZone;
  snowLoadKPa:        number;       // Sg, кПа. Для городов — табл. К.1 СП 20, для зон — табл. 10.1.
  windPressureKPa:    number;       // w0, кПа. Табл. 11.1 СП 20.
  seismicLevel:       SeismicLevel;
  permafrost:         boolean;       // вечная мерзлота → сваи 6м+
  winterSurchargePct: number;       // надбавка к работам янв-март (0.0-0.5)
  description:        string;
}

// Районы СП нужны для грубой группировки, а численные Sg/w0 — для расчётных коэффициентов.
// Красноярск/Ачинск/Канск/Норильск откалиброваны по табл. К.1 СП 20.13330.2016.

export const REGIONS: RegionParams[] = [
  {
    id: "krsk_city",
    label: "Красноярск + пригороды",
    cities: ["Красноярск", "Дивногорск", "Сосновоборск", "Берёзовка"],
    snowZone: 3, windZone: 1,
    snowLoadKPa: 1.35, windPressureKPa: 0.23,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.15,
    description: "Красноярск по табл. К.1: Sg≈1.35 кПа. Ветровой район I.",
  },
  {
    id: "krsk_south",
    label: "Юг края + Хакасия",
    cities: ["Минусинск", "Шушенское", "Абакан", "Черногорск", "Курагино"],
    snowZone: 3, windZone: 1,
    snowLoadKPa: 1.20, windPressureKPa: 0.23,
    seismicLevel: 7,
    permafrost: false, winterSurchargePct: 0.10,
    description: "Снег обычно ниже Красноярска, но сейсмика 7 баллов требует усиленных узлов.",
  },
  {
    id: "krsk_kansk",
    label: "Канск / Ачинск",
    cities: ["Канск", "Ачинск", "Назарово", "Боготол"],
    snowZone: 3, windZone: 1,
    snowLoadKPa: 1.25, windPressureKPa: 0.23,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "Консервативно по Ачинску Sg≈1.25 кПа; Канск ниже. Площадку уточнять.",
  },
  {
    id: "krsk_north_pre",
    label: "Лесосибирск / Енисейск",
    cities: ["Лесосибирск", "Енисейск", "Северо-Енисейский"],
    snowZone: 4, windZone: 2,
    snowLoadKPa: 1.80, windPressureKPa: 0.30,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.25,
    description: "Север края: повышенный снег и зимний коэффициент, без режима мерзлоты.",
  },
  {
    id: "krsk_priangar",
    label: "Богучаны / Кодинск",
    cities: ["Богучаны", "Кодинск", "Усть-Илимск", "Тайшет"],
    snowZone: 4, windZone: 2,
    snowLoadKPa: 2.00, windPressureKPa: 0.30,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.30,
    description: "Приангарье: ориентир Sg≈2.0 кПа, требуется уточнение по населённому пункту.",
  },
  {
    id: "krsk_evenkia",
    label: "Эвенкия (мерзлота)",
    cities: ["Тура", "Ванавара", "Байкит"],
    snowZone: 5, windZone: 4,
    snowLoadKPa: 2.50, windPressureKPa: 0.48,
    seismicLevel: 6,
    permafrost: true, winterSurchargePct: 0.40,
    description: "ВЕЧНАЯ МЕРЗЛОТА — сваи 6-8 м, утеплённый ростверк.",
  },
  {
    id: "krsk_taymyr",
    label: "Таймыр / Норильск",
    cities: ["Норильск", "Дудинка", "Игарка", "Хатанга"],
    snowZone: 5, windZone: 5,
    snowLoadKPa: 2.40, windPressureKPa: 0.60,
    seismicLevel: 6,
    permafrost: true, winterSurchargePct: 0.45,
    description: "Норильск по табл. К.1: Sg≈2.40 кПа + мерзлота и сильный ветер.",
  },
  {
    id: "tuva",
    label: "Тува",
    cities: ["Кызыл", "Ак-Довурак", "Туран"],
    snowZone: 4, windZone: 2,
    snowLoadKPa: 1.80, windPressureKPa: 0.30,
    seismicLevel: 8,
    permafrost: false, winterSurchargePct: 0.20,
    description: "Сейсмика 8 баллов — обязательный спецрасчёт узлов.",
  },
  {
    id: "kemerovo",
    label: "Кемеровская область",
    cities: ["Кемерово", "Новокузнецк", "Прокопьевск", "Белово"],
    snowZone: 4, windZone: 2,
    snowLoadKPa: 1.80, windPressureKPa: 0.30,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "Кемерово/Новокузнецк: ориентир Sg≈1.8 кПа; Междуреченск выше.",
  },
  {
    id: "irkutsk",
    label: "Иркутская область",
    cities: ["Иркутск", "Ангарск", "Братск", "Усть-Илимск"],
    snowZone: 3, windZone: 2,
    snowLoadKPa: 1.50, windPressureKPa: 0.30,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "III снеговая зона. Сейсмика 6-8 в зависимости от города.",
  },
  {
    id: "altai",
    label: "Алтай",
    cities: ["Барнаул", "Бийск", "Горно-Алтайск"],
    snowZone: 3, windZone: 2,
    snowLoadKPa: 1.20, windPressureKPa: 0.30,
    seismicLevel: 7,
    permafrost: false, winterSurchargePct: 0.15,
    description: "Юг Сибири, мягкие зимы.",
  },
  {
    id: "other",
    label: "Другое направление",
    cities: [],
    snowZone: 3, windZone: 1,
    snowLoadKPa: 1.35, windPressureKPa: 0.23,
    seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.15,
    description: "Параметры по умолчанию. Уточняется индивидуально.",
  },
];

export function getRegion(id: string | undefined): RegionParams {
  if (!id) return REGIONS[0];
  return REGIONS.find(r => r.id === id) ?? REGIONS[0];
}

// Является ли сейчас "зимний период" (по дате) — для автоматического добавления надбавки
// В простой версии — фиксированно янв-март.
export function isWinterPeriod(date = new Date()): boolean {
  const m = date.getMonth(); // 0-11
  return m === 11 || m === 0 || m === 1 || m === 2; // дек, янв, фев, март
}
