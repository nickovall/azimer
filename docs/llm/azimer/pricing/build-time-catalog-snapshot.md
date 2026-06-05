# Build-time catalog snapshot — как обновлять цены в калькуляторе

> Создано: 2026-06-02
> Контекст: рефакторинг «каталог цен в БД как источник правды»

## TL;DR

Цены движка калькулятора живут в Supabase `catalog_items`. Перед каждым билдом сайта скрипт `scripts/build-catalog.mts` тянет актуальный snapshot и генерирует `lib/calculator/catalog.generated.ts`. Чтобы поменять цену — правишь в админке `/console-x9p4m2/catalog` → пушишь любой коммит в `main` (или Run pipeline в GitLab) → через ~5 мин новые цены в проде.

## Проблема, которую решали

Раньше цены движка лежали в `lib/calculator/catalog.ts` как статические TS-константы. Параллельно в Supabase была таблица `catalog_items` с теми же 96 позициями и админкой для редактирования — но движок её не читал. Получались два источника правды:

- Менеджер правит цену в админке → в БД новое значение → расчёт на сайте **не меняется** (читает TS)
- Программист правит TS → пуш → пересборка → расчёт меняется, но БД отстала

Это давало рассинхрон. На момент рефакторинга 9 позиций металла в БД были на месяцы устаревшие (например `metal_welding_per_ton` БД=8 000, TS=25 000 после инженерного аудита 2026-06-02).

## Решение: build-time snapshot

```
[Supabase catalog_items] ──┐
                            │ (anon read RLS)
                            ▼
            scripts/build-catalog.mts        ← prebuild hook
                            │
                            ▼
       lib/calculator/catalog.generated.ts  ← gitignored, регенерится каждый билд
                            ▲
                            │ (re-export)
            lib/calculator/catalog.ts        ← thin wrapper, никогда не редактируется
                            ▲
                            │ (импорт)
        lib/calculator/engine.ts + modules/*  ← без изменений
```

### Цикл обновления цены

1. Менеджер заходит в `/console-x9p4m2/catalog`, правит цену, жмёт «Сохранить»
2. Админка вызывает `admin-api` Edge Function → `update_catalog_price` RPC
3. В `catalog_items` появляется новая запись, старая получает `valid_to = now()` (полная история сохраняется)
4. Менеджер заходит в GitLab → `Run pipeline` (или просто пушит любой коммит)
5. CI запускает `npm run build` → срабатывает `prebuild` hook → генератор тянет свежий snapshot из БД → `next build` собирает с новыми ценами
6. Через ~5 мин новые цены в проде

### Snapshot версии в каждом КП

При создании заявки через `/estimate` в `leads.catalog_version` записывается строка вида `db-snapshot-2026-06-02-0725-622074`. Это позволяет:

- Понять по какой версии каталога считался конкретный КП
- При расследовании спорных КП — восстановить контекст (`select * from catalog_items where valid_from <= leads.created_at`)
- Видеть в карточке заявки в админке отметку «Версия каталога: ...»

## Что осталось в коде (НЕ в БД)

- **FINANCE** — нормативы НР/СП/маржи. Менять только программисту, не админу через UI.
- **LOGISTICS** — структура `{fixed, per_km}` не вписывается в numeric price-колонку. Движок её всё равно не использует (Азамат считает доставку отдельно).

## Грабли

### `npx tsx` vs `node` для запуска тестов

Тесты в `B:/dbtest/test-*.mjs` импортируют TS из `azimer-site/lib/calculator/*` через extensionless импорты (`./types`, `./engine`). Это работает с `tsx`, но падает с native `node`:

```
ERR_MODULE_NOT_FOUND: Cannot find module './types'
```

**Решение**: всегда запускать через `npx --yes tsx test-*.mjs`. Native Node TS-strip не делает resolution без расширений.

### `.ts` extension в импортах ломает Next build

Соблазнительно писать `export * from "./catalog.generated.ts"` чтобы помочь Node. Но это требует `allowImportingTsExtensions: true` в tsconfig — а Next 16 без этой опции упадёт на type-check:

```
Type error: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.
```

**Решение**: оставлять impотры без расширения, использовать `tsx` для тестов.

### Fail-fast при недоступной БД

Генератор намеренно **не fallback'ится** на старые цены, если БД недоступна. Иначе можно тихо задеплоить устаревший снапшот. Если CI упал на этапе prebuild с ошибкой `Supabase error` — это диагностика, не баг.

Эталон (на случай катастрофы) лежит в `lib/calculator/catalog.fallback.ts` — это бывший `catalog.ts`, закоммичен. Если БД и связь отвалятся надолго — можно временно вернуть `catalog.ts` на `export * from "./catalog.fallback"`.

### Sync-скрипт TS → DB (одноразовый)

`B:/dbtest/sync-catalog-from-ts.mts` использовался ОДИН РАЗ для приведения БД в соответствие с актуальным `catalog.ts` (после аудита 2026-06-02). Больше запускать **не нужно**, если только не появится новый рассинхрон.

### Связи

- HANDOFF.md проекта АЗИМЕР: раздел «Calculator v3 — подробно»
- `pricing/krasnoyarsk-calculator-research-2026-06-01.md` — рыночное обоснование цен
- `supabase/edge-functions-gotchas.md` — про admin-api и CORS
- `supabase/new-vs-legacy-keys.md` — про sb_publishable_ vs eyJ…
