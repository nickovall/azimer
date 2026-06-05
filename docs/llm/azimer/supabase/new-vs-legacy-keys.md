# Supabase: новые ключи (`sb_publishable_…`) vs legacy (`eyJ…`)

> **TL;DR:** У проектов созданных после 2025-09 две системы ключей. Старые функции принимают только legacy (`eyJ…`), новые функции — только publishable (`sb_publishable_…`). Это **молча** — gateway возвращает `INVALID_CREDENTIALS 401` без подсказок. Час времени съедено.

## Проблема

Создаёшь новую Edge Function через Dashboard. Старый anon-ключ из `gitlab-ci.yml` работает на REST API (`/rest/v1/leads` → 200) и старых функциях (`smooth-task` → 403 forbidden из её кода). Но **новая** функция отбивает с `{"message":"Invalid credentials","code":"INVALID_CREDENTIALS"}` HTTP 401 **до запуска кода** функции.

Симптомы запутывают:
- В Logs функции видно `server started` / `booted` / `shutdown` — функция действительно запускается
- Но HTTP 401 от gateway — то есть запрос не доходит до твоего кода (твой код вернул бы что-то другое)
- Снятие галки `Verify JWT with legacy secret` в Settings не помогает

## Почему так

Supabase в 2025 разделил API-ключи на две системы:

| | Legacy (старая) | Новая |
|---|---|---|
| Anon-like | `eyJhbGciOiJIUzI1NiI...` (JWT HS256) | `sb_publishable_…` |
| Service-like | service_role JWT | `sb_secret_…` |
| Видны в Dashboard | Settings → API Keys → **Legacy anon, service_role API keys** | Settings → API Keys → **Publishable and secret API keys** |

Старые Edge Functions (созданные до миграции) валидируют через legacy HS256. Новые — через новую систему. **Конкретный набор валидаторов фиксируется на момент создания функции.**

## Решение

Использовать `publishable key` (`sb_publishable_…`) для **новых** функций, оставить legacy для **старых** функций и REST API.

```ts
// lib/admin-api.ts:7-13
export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // fallback на legacy
  ?? "";

await fetch(ADMIN_FN_URL, {
  headers: {
    "Authorization": "Bearer " + PUBLISHABLE_KEY,
    "apikey":        PUBLISHABLE_KEY,            // обязателен оба
  },
  ...
});
```

В `.gitlab-ci.yml` — обе переменные (старая для совместимости):
```yaml
NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJ...                         # для REST + smooth-task
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable__2Mwa…  # для admin-api
```

## Где взять ключи

Project Settings → API Keys → две вкладки:
1. **Publishable and secret API keys** — новая система (по умолчанию)
2. **Legacy anon, service_role API keys** — старые ключи (помечены `Prefer using Publishable API keys instead`)

**НЕ нажимай** `Disable JWT-based API keys` внизу — сломает все старые функции и REST.

## Грабли

- `Verify JWT with legacy secret` toggle off не делает функцию совместимой с legacy ключом для новой функции — это про разрешение **legacy ключа** на проверку.
- `apikey` header **тоже обязателен**, не только `Authorization: Bearer`. Без него gateway режет.
- Старые туториалы Supabase из 2024-го используют `eyJ…` — для новых проектов это уже неактуально.
- Curl без CORS preflight работает с любым ключом; браузер с preflight не даёт ошибки понять (см. [edge-functions-gotchas.md](edge-functions-gotchas.md#cors-whitelist)).

## See also

- [edge-functions-gotchas.md](edge-functions-gotchas.md) — другие грабли Edge Functions
- Реальный конфиг: [azimer-site/.gitlab-ci.yml](../../azimer-site/.gitlab-ci.yml), [azimer-site/lib/admin-api.ts](../../azimer-site/lib/admin-api.ts)
