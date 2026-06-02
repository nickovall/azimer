// АЗИМЕР — Build-time генератор lib/calculator/catalog.generated.ts
//
// Запускается из package.json через prebuild hook.
// Подключается к Supabase через анон-ключ (public read RLS на catalog_items),
// читает view catalog_current, собирает TS-файл со структурой 1:1 как catalog.fallback.ts.
//
// Если БД недоступна → fail fast (не молчаливый fallback на старые цены).
//
// Запуск вручную: npm run gen:catalog

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../lib/calculator/catalog.generated.ts");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing in env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

interface DbItem {
  category: string;
  key: string;
  label: string;
  unit: string;
  price: number;
  valid_from: string;
}

console.log("→ Fetching catalog_current from Supabase ...");
const { data, error } = await supabase
  .from("catalog_current")
  .select("category, key, label, unit, price, valid_from")
  .order("category", { ascending: true })
  .order("key", { ascending: true });

if (error) {
  console.error("✗ Supabase error:", error.message);
  process.exit(1);
}

const items = (data ?? []) as DbItem[];
if (items.length === 0) {
  console.error("✗ catalog_current returned 0 rows — refusing to generate empty catalog");
  process.exit(1);
}

console.log(`✓ Got ${items.length} active catalog items`);

// ───────── Группировка по category ─────────
const byCat = new Map<string, DbItem[]>();
for (const it of items) {
  const arr = byCat.get(it.category) ?? [];
  arr.push(it);
  byCat.set(it.category, arr);
}

// ───────── Утилиты ─────────
function flat(category: string): Record<string, number> {
  const rows = byCat.get(category) ?? [];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.key] = Number(r.price);
  return out;
}

// Sandwich keys: wall_minvata_150 → SANDWICH.wall_minvata[150]
function nestedSandwich(): Record<string, Record<string, number>> {
  const rows = byCat.get("sandwich") ?? [];
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const m = r.key.match(/^(.+?)_(\d+)$/);
    if (!m) {
      console.warn(`  ⚠ sandwich key "${r.key}" не соответствует pattern outer_thickness — пропускаем`);
      continue;
    }
    const [, outer, thk] = m;
    if (!out[outer]) out[outer] = {};
    out[outer][thk] = Number(r.price);
  }
  return out;
}

function tsObject(obj: Record<string, number>, indent = "  "): string {
  const keys = Object.keys(obj).sort();
  const lines = keys.map((k) => `${indent}${k}: ${obj[k]},`);
  return `{\n${lines.join("\n")}\n}`;
}

function tsNested(obj: Record<string, Record<string, number>>, indent = "  "): string {
  const outerKeys = Object.keys(obj).sort();
  const lines: string[] = [];
  for (const outer of outerKeys) {
    const innerKeys = Object.keys(obj[outer]).sort((a, b) => Number(a) - Number(b));
    const innerLines = innerKeys.map((thk) => `${indent}  ${thk}: ${obj[outer][thk]},`);
    lines.push(`${indent}${outer}: {\n${innerLines.join("\n")}\n${indent}},`);
  }
  return `{\n${lines.join("\n")}\n}`;
}

// ───────── Версия ─────────
const serialized = JSON.stringify(
  items.map((i) => ({ c: i.category, k: i.key, p: i.price })),
);
const sha6 = createHash("sha256").update(serialized).digest("hex").slice(0, 6);
const now = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
const versionStamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const CATALOG_VERSION = `db-snapshot-${versionStamp}-${sha6}`;

console.log(`→ CATALOG_VERSION = ${CATALOG_VERSION}`);

// ───────── Сборка файла ─────────
const sandwich = nestedSandwich();
const proflist = flat("proflist");
const trim     = flat("trim");
const hardware = flat("hardware");
const metal    = flat("metal");
const foundation = flat("foundation");
const openings = flat("openings");
const works    = flat("works");
const interior = flat("interior");
const finance  = flat("finance");

const header = `// АЗИМЕР — Каталог цен (АВТО-СГЕНЕРИРОВАНО — НЕ РЕДАКТИРОВАТЬ ВРУЧНУЮ)
// Источник: Supabase catalog_items (view catalog_current)
// Сгенерировано: ${now.toISOString()}
// Версия: ${CATALOG_VERSION}
// Позиций в БД: ${items.length}
//
// Чтобы изменить цены — правь в админке /console-x9p4m2/catalog,
// затем запусти ребилд (push в main или Run pipeline в GitLab).
//
// LOGISTICS реэкспортируется из catalog.fallback (движок её не использует).

export const CATALOG_VERSION = "${CATALOG_VERSION}";

`;

const body = `
// ────────────────── СЭНДВИЧ-ПАНЕЛИ ──────────────────
export const SANDWICH = ${tsNested(sandwich)} as const;

// ────────────────── ПРОФЛИСТ ──────────────────
export const PROFLIST = ${tsObject(proflist)} as const;

// ────────────────── ФАСОННЫЕ ЭЛЕМЕНТЫ ──────────────────
export const TRIM = ${tsObject(trim)} as const;

// ────────────────── КРЕПЁЖ И РАСХОДНИКИ ──────────────────
export const HARDWARE = ${tsObject(hardware)} as const;

// ────────────────── МЕТАЛЛОПРОКАТ ──────────────────
export const METAL = ${tsObject(metal)} as const;

// ────────────────── ФУНДАМЕНТ ──────────────────
export const FOUNDATION = ${tsObject(foundation)} as const;

// ────────────────── ДОБОРНЫЕ ──────────────────
export const OPENINGS = ${tsObject(openings)} as const;

// ────────────────── РАСЦЕНКИ НА РАБОТЫ ──────────────────
export const WORKS = ${tsObject(works)} as const;

// ────────────────── ВНУТРЕННИЕ РАБОТЫ ──────────────────
export const INTERIOR = ${tsObject(interior)} as const;

// ────────────────── ФИНАНСЫ ──────────────────
export const FINANCE = ${tsObject(finance)} as const;

// ────────────────── ЛОГИСТИКА ──────────────────
// Структура {fixed, per_km} не помещается в numeric price — берём из fallback.
// Движок engine.ts её не использует (Азамат считает доставку отдельно).
export { LOGISTICS } from "./catalog.fallback";
`;

writeFileSync(OUT_PATH, header + body, "utf-8");
console.log(`✓ Wrote ${OUT_PATH}`);
console.log(`  ${items.length} items, ${(header.length + body.length).toLocaleString()} bytes`);
