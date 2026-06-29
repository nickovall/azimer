import type { Metadata } from "next";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Audiences from "@/components/sections/Audiences";
import Advantages from "@/components/sections/Advantages";
import Process from "@/components/sections/Process";
import Gallery from "@/components/sections/Gallery";
import Objects from "@/components/sections/Objects";
// Благодарственные письма не публикуем на сайте по пожеланию заказчика.
// Не возвращать без нового явного согласования.
import Trust from "@/components/sections/Trust";
import CtaFinal from "@/components/sections/CtaFinal";
import JsonLd from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/seo-jsonld";

export const metadata: Metadata = {
  title: "АЗИМЕР — Каркасные здания под ключ · Красноярск",
  description:
    "ООО «АЗИМЕР» — проектирование, изготовление и монтаж каркасных зданий: жилые дома, склады, ангары, производственные и коммерческие объекты. Красноярск.",
  alternates: { canonical: "https://azimer.ru" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://azimer.ru",
    siteName: "АЗИМЕР",
    title: "АЗИМЕР — Каркасные здания под ключ · Красноярск",
    description:
      "ООО «АЗИМЕР» — проектирование, изготовление и монтаж каркасных зданий: жилые дома, склады, ангары, производственные и коммерческие объекты. Красноярск.",
    images: [
      {
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "АЗИМЕР — каркасные здания под ключ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "АЗИМЕР — Каркасные здания под ключ · Красноярск",
    description:
      "ООО «АЗИМЕР» — проектирование, изготовление и монтаж каркасных зданий: жилые дома, склады, ангары, производственные и коммерческие объекты. Красноярск.",
    images: ["/og-image.png?v=2"],
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={faqPageJsonLd} />
      <Hero />
      <Stats />
      <About />
      <Services />
      <Audiences />
      <Advantages />
      <Process />
      <Gallery />
      <Objects />
      <Trust />
      <CtaFinal />
    </>
  );
}
