import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // ВАЖНО: GitLab Pages обслуживает /path/ как /path/index.html.
  // Без trailingSlash Next генерирует path.html на флэте — все прямые URL отдают 404.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
