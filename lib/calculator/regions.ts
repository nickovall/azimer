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
  seismicLevel:       SeismicLevel;
  permafrost:         boolean;       // вечная мерзлота → сваи 6м+
  winterSurchargePct: number;       // надбавка к работам янв-март (0.0-0.5)
  description:        string;
}

// 9 регионов Красноярского края и соседей — покрывают 95% реальных заказов АЗИМЕРа

export const REGIONS: RegionParams[] = [
  {
    id: "krsk_city",
    label: "Красноярск + пригороды",
    cities: ["Красноярск", "Дивногорск", "Сосновоборск", "Берёзовка"],
    snowZone: 3, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.15,
    description: "III снеговая зона, 1.5 кПа. Стандартные грунты.",
  },
  {
    id: "krsk_south",
    label: "Юг края + Хакасия",
    cities: ["Минусинск", "Шушенское", "Абакан", "Черногорск", "Курагино"],
    snowZone: 3, windZone: 3, seismicLevel: 7,
    permafrost: false, winterSurchargePct: 0.10,
    description: "Сейсмика 7 баллов — узлы каркаса усиленные.",
  },
  {
    id: "krsk_kansk",
    label: "Канск / Ачинск",
    cities: ["Канск", "Ачинск", "Назарово", "Боготол"],
    snowZone: 4, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "IV снеговая зона, 2.0 кПа. Каркас +10% к Красноярску.",
  },
  {
    id: "krsk_north_pre",
    label: "Лесосибирск / Енисейск",
    cities: ["Лесосибирск", "Енисейск", "Северо-Енисейский"],
    snowZone: 4, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.25,
    description: "IV снеговая зона, удалённые объекты — доплата за холод.",
  },
  {
    id: "krsk_priangar",
    label: "Богучаны / Кодинск",
    cities: ["Богучаны", "Кодинск", "Усть-Илимск", "Тайшет"],
    snowZone: 5, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.30,
    description: "V снеговая зона, 2.5 кПа. Каркас +20% к Красноярску.",
  },
  {
    id: "krsk_evenkia",
    label: "Эвенкия (мерзлота)",
    cities: ["Тура", "Ванавара", "Байкит"],
    snowZone: 5, windZone: 4, seismicLevel: 6,
    permafrost: true, winterSurchargePct: 0.40,
    description: "ВЕЧНАЯ МЕРЗЛОТА — сваи 6-8 м, утеплённый ростверк.",
  },
  {
    id: "krsk_taymyr",
    label: "Таймыр / Норильск",
    cities: ["Норильск", "Дудинка", "Игарка", "Хатанга"],
    snowZone: 7, windZone: 5, seismicLevel: 6,
    permafrost: true, winterSurchargePct: 0.45,
    description: "VII зона + вечная мерзлота. Каркас +60% к Красноярску.",
  },
  {
    id: "tuva",
    label: "Тува",
    cities: ["Кызыл", "Ак-Довурак", "Туран"],
    snowZone: 4, windZone: 3, seismicLevel: 8,
    permafrost: false, winterSurchargePct: 0.20,
    description: "Сейсмика 8 баллов — обязательный спецрасчёт узлов.",
  },
  {
    id: "kemerovo",
    label: "Кемеровская область",
    cities: ["Кемерово", "Новокузнецк", "Прокопьевск", "Белово"],
    snowZone: 4, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "IV снеговая зона.",
  },
  {
    id: "irkutsk",
    label: "Иркутская область",
    cities: ["Иркутск", "Ангарск", "Братск", "Усть-Илимск"],
    snowZone: 3, windZone: 3, seismicLevel: 6,
    permafrost: false, winterSurchargePct: 0.20,
    description: "III снеговая зона. Сейсмика 6-8 в зависимости от города.",
  },
  {
    id: "altai",
    label: "Алтай",
    cities: ["Барнаул", "Бийск", "Горно-Алтайск"],
    snowZone: 3, windZone: 3, seismicLevel: 7,
    permafrost: false, winterSurchargePct: 0.15,
    description: "Юг Сибири, мягкие зимы.",
  },
  {
    id: "other",
    label: "Другое направление",
    cities: [],
    snowZone: 3, windZone: 3, seismicLevel: 6,
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
