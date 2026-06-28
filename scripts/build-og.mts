/**
 * build-og.mts — генерирует public/og-image.png (1200×630) для соцпревью.
 *
 * Почему скрипт, а не PNG из редактора: старую картинку правили руками, эмблему
 * раздули и посадили отдельным колесом — она дублировала букву «А» и наезжала на
 * заголовок. Здесь превью собирается из КАНОНИЧНОГО logo-light.svg (эмблема уже
 * стоит на месте «А»), поэтому логотип всегда правильный и воспроизводимый.
 *
 * Запуск:  npx tsx scripts/build-og.mts
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;

const GRAPHITE = "#262624";
const ORANGE = "#ED6629";
const WHITE = "#ffffff";
const MUTED = "#9a9a97";

// ─── Логотип: канон logo-light.svg (эмблема = буква «А», белые буквы под тёмный фон) ───
const LOGO_W = 600; // px на холсте; высота получится пропорционально (1280×481)
const logoBuf = await sharp(join(root, "public", "logo-light.svg"), { density: 300 })
  .resize({ width: LOGO_W })
  .png()
  .toBuffer();
const logoMeta = await sharp(logoBuf).metadata();
const LOGO_X = 72;
const LOGO_Y = 70;
const logoBottom = LOGO_Y + (logoMeta.height ?? 226);

// ─── Фон + сетка + тексты ───
const grid: string[] = [];
for (let x = 150; x < W; x += 150)
  grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${WHITE}" stroke-opacity="0.035"/>`);
for (let y = 150; y < H; y += 150)
  grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${WHITE}" stroke-opacity="0.035"/>`);

const headlineY = logoBottom + 96;       // заголовок ниже логотипа, без наезда
const subY = headlineY + 70;
const bottomY = H - 56;

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GRAPHITE}"/>
  ${grid.join("")}
  <rect x="0" y="0" width="12" height="${H}" fill="${ORANGE}"/>
  <text x="${LOGO_X + 6}" y="${headlineY}" font-family="Arial, sans-serif" font-weight="700"
        font-size="64" fill="${WHITE}">Каркасные здания</text>
  <text x="${LOGO_X + 6}" y="${subY}" font-family="Arial, sans-serif" font-weight="700"
        font-size="64" fill="${ORANGE}" letter-spacing="2">ПОД КЛЮЧ</text>
  <text x="${LOGO_X + 6}" y="${bottomY}" font-family="Arial, sans-serif" font-weight="400"
        font-size="26" fill="${MUTED}">Жилые дома · Склады · Ангары · АБК · Бытовки</text>
  <text x="${W - 64}" y="${bottomY}" text-anchor="end" font-family="Arial, sans-serif"
        font-weight="700" font-size="30" fill="${ORANGE}">azimer.ru</text>
</svg>`;

await sharp(Buffer.from(bg))
  .composite([{ input: logoBuf, left: LOGO_X, top: LOGO_Y }])
  .png()
  .toFile(join(root, "public", "og-image.png"));

console.log(`og-image.png готов — логотип ${logoMeta.width}×${logoMeta.height}, низ лого y=${logoBottom}`);
