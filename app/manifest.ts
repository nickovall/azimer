import type { MetadataRoute } from "next";

// Требование Next 16 + output: 'export': route-хендлер должен быть статичен.
export const dynamic = "force-static";

// PWA-манифест ТОЛЬКО для админки — публичный сайт остаётся обычным сайтом.
// scope=/console-x9p4m2/ означает что иконка на хом-экране → открывается на дашборде,
// а клики по обычным azimer.ru ссылкам уходят в браузер.
// start_url с gate-key чтобы не вводить URL вручную каждый раз.
const ADMIN_GATE_KEY = process.env.NEXT_PUBLIC_ADMIN_GATE_KEY ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "АЗИМЕР Админ",
    short_name: "АЗИМЕР",
    description: "Рабочий стол сделок ООО «АЗИМЕР»",
    start_url: ADMIN_GATE_KEY
      ? `/console-x9p4m2/?k=${ADMIN_GATE_KEY}`
      : "/console-x9p4m2/",
    scope: "/console-x9p4m2/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    lang: "ru",
    orientation: "any",
    icons: [
      {
        src: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
