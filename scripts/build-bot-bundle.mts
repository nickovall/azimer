// АЗИМЕР — Bundle калькулятора для Telegram-бота (Deno runtime)
//
// Берёт публичный API lib/calculator/index.ts, собирает через esbuild в один
// Deno-совместимый ESM-файл и кладёт в supabase/functions/_shared/.
//
// Запускается ПОСЛЕ scripts/build-catalog.mts (нужен catalog.generated.ts).
// Запуск: npm run build:bot-bundle
//
// Результат — bundle/calculator.js — gitignored, регенерируется каждый билд.
// telegram-bot/index.ts импортирует оттуда полный engine v3, чтобы бот считал
// КП той же логикой что и сайт (один источник правды).

import * as esbuild from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(__dirname, "../lib/calculator/index.ts");
const OUT   = resolve(__dirname, "../supabase/functions/_shared/calculator.bundle.js");

console.log("→ Bundling lib/calculator → supabase/functions/_shared/calculator.bundle.js ...");

const result = await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: "esm",
  platform: "neutral",      // не node, не browser — universal ESM (Deno OK)
  target: "es2022",
  outfile: OUT,
  // Всё резолвится через bundle — внешних зависимостей не должно быть
  external: [],
  minify: false,            // удобнее отлаживать когда что-то пойдёт не так
  sourcemap: false,
  legalComments: "none",
  banner: {
    js: "// АВТО-СГЕНЕРИРОВАНО esbuild'ом — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ\n" +
        "// Источник: lib/calculator/index.ts (engine v3 + catalog.generated)\n" +
        `// Сгенерировано: ${new Date().toISOString()}\n`,
  },
  logLevel: "info",
});

if (result.errors.length > 0) {
  console.error("✗ esbuild errors:", result.errors);
  process.exit(1);
}

const size = statSync(OUT).size;
console.log(`✓ Wrote ${OUT}`);
console.log(`  ${(size / 1024).toFixed(1)} KB`);
