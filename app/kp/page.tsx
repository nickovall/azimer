import type { Metadata } from "next";
import KpClient from "./KpClient";

export const metadata: Metadata = {
  title: "Коммерческое предложение — АЗИМЕР",
  description:
    "Коммерческое предложение ООО «АЗИМЕР» на строительство каркасного здания. Красноярск.",
  alternates: { canonical: "https://azimer.ru/kp" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://azimer.ru/kp",
    siteName: "АЗИМЕР",
    title: "Коммерческое предложение — АЗИМЕР",
    description:
      "Коммерческое предложение ООО «АЗИМЕР» на строительство каркасного здания. Красноярск.",
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
    title: "Коммерческое предложение — АЗИМЕР",
    description:
      "Коммерческое предложение ООО «АЗИМЕР» на строительство каркасного здания. Красноярск.",
    images: ["/og-image.png?v=2"],
  },
  robots: { index: false },
};

export default function KpPage() {
  return <KpClient />;
}
