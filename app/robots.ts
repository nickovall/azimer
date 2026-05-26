import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Защищаем технические страницы и формы
      { userAgent: "*", disallow: ["/thanks", "/api/"] },
    ],
    sitemap: "https://azimer.ru/sitemap.xml",
    host:    "https://azimer.ru",
  };
}
