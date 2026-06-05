// АЗИМЕР — Build-time генератор QR-кода для КП/PDF.
//
// Запускается вручную: npm run gen:qr
// Также — на каждом prebuild через package.json (быстро, idempotent).
//
// Target URL берётся из lib/content.ts (company.qrSiteHref).
// Если владелец положит брендированный PNG QR в public/qr-azimer-site.png
// вручную, этот скрипт его перепишет — это сознательно, чтобы избежать
// неконсистентности URL→картинка. Хочешь брендированный — закоммить отдельно
// и удали build-qr из prebuild.

import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../public/qr-azimer-site.png");

// Минимальный импорт без всего content.ts — qrSiteHref зафиксирован.
const TARGET = "https://azimer.ru/";

console.log(`→ Generating QR for ${TARGET} → ${OUT_PATH}`);

await QRCode.toFile(OUT_PATH, TARGET, {
  type: "png",
  errorCorrectionLevel: "M",  // средний уровень коррекции, баланс размер/надёжность
  margin: 2,
  width: 512,                  // достаточно для печати КП до A4
  color: {
    dark:  "#1D1C1C",          // graphite-950 — чтобы совпадало с PDF-документом
    light: "#FFFFFF",
  },
});

console.log("✓ QR written");
