import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://azimer.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "",                 priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/services",        priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/projects",        priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/about",           priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/contacts",        priority: 0.8, changeFrequency: "yearly" as const },
    { path: "/estimate",        priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/estimate-project",priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/partners",        priority: 0.6, changeFrequency: "yearly" as const },
    { path: "/privacy",         priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return routes.map((r) => ({
    url:             `${BASE}${r.path}`,
    lastModified:    now,
    changeFrequency: r.changeFrequency,
    priority:        r.priority,
  }));
}
