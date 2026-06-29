import { company } from "@/lib/content";

const SITE_URL = "https://azimer.ru";

export const organizationJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: company.name,
  alternateName: [company.legalName, "Азимер", "Azimer"],
  legalName: company.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-light.svg`,
  image: `${SITE_URL}/og-image.png`,
  slogan: company.tagline,
  description:
    "Проектирование, изготовление и монтаж каркасных зданий под ключ: жилые дома, склады, ангары, производственные и коммерческие объекты.",
  telephone: company.phoneHref.replace(/^tel:/, ""),
  email: company.email,
  taxID: company.inn,
  foundingDate: "2023-02-17",
  founder: {
    "@type": "Person",
    name: company.director,
  },
  identifier: [
    { "@type": "PropertyValue", propertyID: "ИНН", value: company.inn },
    { "@type": "PropertyValue", propertyID: "ОГРН", value: company.ogrn },
    { "@type": "PropertyValue", propertyID: "КПП", value: company.kpp },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "ул. Караульная, д. 88, офис 9-21",
    addressLocality: "Красноярск",
    addressRegion: "Красноярский край",
    postalCode: "660020",
    addressCountry: "RU",
  },
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Красноярский край",
  },
  priceRange: "₽₽₽",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  knowsAbout: [
    "каркасное строительство",
    "каркасные здания",
    "металлокаркасы",
    "ЛСТК",
    "ангары",
    "склады",
    "кровельные работы",
  ],
  sameAs: [
    company.vkProfileHref,
    "https://companies.rbc.ru/id/1232400004242-obschestvo-s-ogranichennoj-otvetstvennostyu-azimer/",
    "https://checko.ru/company/azimer-1232400004242",
    "https://www.list-org.com/company/13903408",
  ],
};

export const websiteJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: company.name,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const serviceJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Строительство каркасных зданий под ключ",
  provider: { "@id": `${SITE_URL}/#organization` },
  areaServed: { "@type": "AdministrativeArea", name: "Красноярский край" },
  serviceType: "Каркасное строительство",
  description:
    "Проектирование, изготовление и монтаж металлокаркасов, ЛСТК, модульных зданий, сэндвич-панелей. Жилые дома, склады, ангары, АБК, бытовки. Красноярск.",
  offers: {
    "@type": "Offer",
    priceCurrency: "RUB",
    priceSpecification: {
      "@type": "PriceSpecification",
      description: "Зависит от типа и размеров объекта. Расчёт онлайн.",
    },
  },
};

export const faqPageJsonLd: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Сколько стоит построить ангар под ключ в Красноярске?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Стоимость зависит от площади, назначения, типа каркаса и степени утепления. Используйте онлайн-мастер расчёта на azimer.ru/estimate — за 3–5 минут получите предварительную вилку цен и заявку на коммерческое предложение.",
      },
    },
    {
      "@type": "Question",
      name: "Какие типы зданий строит АЗИМЕР?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Жилые дома, склады, производственные и сельскохозяйственные здания, ангары, административно-бытовые корпуса (АБК), бытовки и коммерческие объекты. Работаем по всему Красноярскому краю.",
      },
    },
    {
      "@type": "Question",
      name: "Работает ли АЗИМЕР с юридическими лицами и выставляет ли НДС?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да. ООО «АЗИМЕР» работает на общей системе налогообложения (ОСН). Предоставляем счета-фактуры, закрывающие документы, акты КС-2 и КС-3. НДС выделяется в документах.",
      },
    },
    {
      "@type": "Question",
      name: "Как долго строится каркасное здание?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Сроки зависят от объёма: небольшой ангар или склад — от 1,5–2 месяцев, крупный производственный объект — от 3–6 месяцев. В смету входят проектирование, изготовление и монтаж.",
      },
    },
    {
      "@type": "Question",
      name: "Работает ли компания за пределами Красноярска?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да, АЗИМЕР работает по всему Красноярскому краю и в других регионах Сибири — Норильск, Ачинск, Емельяново и другие населённые пункты. Уточните готовность выезда при оформлении заявки.",
      },
    },
  ],
};

export function breadcrumbJsonLd(name: string, item: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item },
    ],
  };
}
