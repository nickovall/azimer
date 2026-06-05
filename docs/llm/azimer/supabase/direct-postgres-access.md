# Прямой Postgres доступ (миграции, debug, backfill)

> **TL;DR:** Для миграций / админских операций не возиться с Supabase Dashboard SQL Editor и copy-paste — есть прямой PG-connection через connection pooler. Скрипты лежат в `B:/dbtest/*.mjs`.

## Connection string

```js
// B:/dbtest/apply-*.mjs
const password = "Q/#8XRC*77Z4Xv+";
const url = `postgresql://postgres.objgpsjyftdrhafapwvw:${encodeURIComponent(password)}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
```

- **Пользователь:** `postgres.<project-ref>` (не просто `postgres`)
- **Хост:** `aws-0-<region>.pooler.supabase.com:5432` — Supabase Shared Pooler (не direct connection, не Session mode)
- **Регион** прибит в URL — у этого проекта `eu-west-1`
- **Пароль** — из Project Settings → Database → Database Password (если потерян — Reset Password там же)

## Где применимо

✅ **Хорошо для:**
- Применение миграций (DDL: `alter table`, `create function`, и т.д.)
- Backfill / data fixes
- Триггеры pg_net (см. `trigger-telegram-v5.sql`)
- Debug RLS (через `set role postgres` обходим)
- Bulk операции которые в Dashboard SQL Editor таймаутят

❌ **Не годится для:**
- Подключение из браузера (это серверный креденшл, прячь от клиента)
- Регулярные миграции в CI (для этого Supabase CLI лучше)

## Пример скрипта

```js
// B:/dbtest/apply-admin-notes.mjs
import { Client } from "pg";
import { readFileSync } from "fs";

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const sql = readFileSync("./azimer-site/supabase/migration-admin-notes.sql", "utf-8");
await client.query(sql);

// Verify
const cols = await client.query(`
  select column_name from information_schema.columns
  where table_schema='public' and table_name='leads'
`);
console.log(cols.rows);

await client.end();
```

## Грабли

- `rejectUnauthorized: false` обязателен в SSL config для Supabase pooler — иначе self-signed cert error
- Pooler **не поддерживает** session-level features (`LISTEN/NOTIFY`, prepared statements в некоторых клиентах). Для них direct connection на 6543 порт
- В пароле спецсимволы (`/`, `+`, `#`) — обязательно через `encodeURIComponent()`, иначе URL ломается
- Если конект подвисает на 5 минут — проверь VPN/firewall: `aws-0-eu-west-1` иногда режется РКН-фильтрами через мобильного оператора

## See also

- Реальные миграции: `B:/dbtest/apply-*.mjs`
- SQL миграций сайта: `azimer-site/supabase/migration-*.sql`
- [edge-functions-gotchas.md](edge-functions-gotchas.md) — когда обходить Edge через прямой PG
