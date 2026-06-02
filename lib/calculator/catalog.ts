// АЗИМЕР — Re-export сгенерированного каталога
//
// Истина живёт в Supabase `catalog_items` → генератор `scripts/build-catalog.mts`
// собирает `catalog.generated.ts` перед каждым билдом (npm run prebuild).
//
// Этот файл нарочно тонкий: модули движка (modules/*.ts, engine.ts) импортируют
// SANDWICH/PROFLIST/.../FINANCE/CATALOG_VERSION отсюда — менять цены через
// админку → ребилд → новые цифры. Никаких ручных правок в TS.
//
// Если БД отвалится, prebuild упадёт громко (см. scripts/build-catalog.mts).
// Эталон цен на случай восстановления — `catalog.fallback.ts` (committed).

// Тесты в B:/dbtest/*.mjs запускать через `npx tsx` (не `node`) —
// иначе extensionless TS-импорты ниже по дереву не разрешатся.
export * from "./catalog.generated";
