# Supabase Edge Functions — грабли

> **TL;DR:** 3 не-очевидные ловушки: (1) gateway режет custom-headers через CORS preflight; (2) `Deploy a new function` создаёт stub, а не твой код; (3) Verify JWT в Settings — это про legacy.

---

## 1. CORS whitelist в gateway

Supabase Gateway **перехватывает OPTIONS preflight** и возвращает свой CORS-список headers — **не тот, что ты вернул из своей функции**.

Whitelist (на 2026-05):
```
authorization, x-client-info, apikey, content-type, x-retry-count
```

Любой custom header типа `x-admin-password` блокируется браузером на preflight. Curl работает (нет preflight), браузер падает с `Failed to fetch` без внятного сообщения в консоли.

### Решение

Не использовать custom headers для произвольных данных. Для admin flow:

- пароль отправлять только в body запроса `action=login`;
- короткоживущий admin token отправлять в стандартном `Authorization: Bearer`;
- publishable key оставлять в `apikey`.

```ts
// КЛИЕНТ (lib/admin-api.ts)
body: JSON.stringify({ action: "login", password })

// СЕРВЕР (supabase/functions/admin-api/index.ts)
const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
await requireAdminToken(token);
```

### Грабли

- В docs Supabase примеры curl с `Authorization: Bearer JWT` и пишут «можно добавлять headers» — это правда **только для curl**, не для браузера
- В Network tab браузера ты увидишь два запроса: OPTIONS (200) + POST (failed). Ошибка только в OPTIONS, и она читается как `CORS error` без подсказки про конкретный header

---

## 2. `Deploy a new function` создаёт **stub**, не твой код

UI Dashboard в кнопке «Deploy a new function» имеет два шага:
1. Создание функции с **стартовым шаблоном** (`Hello {name}!`)
2. Replace кода на твой

Шаг 2 НЕ происходит автоматически если ты только ввёл имя функции и нажал Deploy.

### Симптом

```
curl ... admin-api -d '{"action":"login","password":"..."}'
→ {"message":"Hello undefined!"} HTTP 200
```

HTTP 200, но возвращается дефолтный шаблон. Значит твой `index.ts` не задеплоен.

### Решение

После создания функции:
1. `Functions → <имя> → Code` tab
2. Полностью очистить редактор (Ctrl+A → Delete)
3. Вставить свой код
4. **Deploy** (зелёная кнопка вверху справа)

### Альтернатива

Деплой через CLI обходит этот баг — там код берётся из локального файла:
```bash
supabase functions deploy admin-api --no-verify-jwt
```

---

## 3. `Verify JWT with legacy secret` toggle

Не делает что ты думаешь. Это переключатель «**требовать ли legacy JWT (HS256) подпись от Authorization header**».

| Toggle | Что меняется |
|---|---|
| ON | Gateway требует чтобы JWT в Authorization был подписан legacy secret. Подходит если ты используешь старый anon key. |
| OFF | Gateway не проверяет legacy JWT — но всё ещё проверяет публикуемый ключ через apikey/Authorization. Custom auth логика в коде функции. |

### Грабли

- Снятие галки **не делает функцию полностью открытой** — gateway всё ещё требует валидный publishable key
- Это **не** про CORS — снять её не помогает с preflight headers
- Документация Supabase: `Recommended: OFF with JWT and custom auth logic in your function code` — но не объясняет что нужно ещё и custom apikey/auth header

---

## Чек-лист отладки 401 от Edge Function

1. **`apikey` header передан**? Без него — 401.
2. **Ключ из правильной системы**? Новая функция требует publishable, см. [new-vs-legacy-keys.md](new-vs-legacy-keys.md)
3. **Verify JWT toggle OFF** в Settings + Save changes (не путать с просто визуальным переключением)
4. **Функция содержит твой код**, а не Hello-stub? Открой Code tab и проверь.
5. Если из браузера падает но curl работает — это **CORS preflight**, кастомный header режется. Перенеси в body.
6. Если в Logs функции видишь `server started` / `shutdown` но 401 от gateway — gateway режет до запуска кода. Ищи на уровне auth (ключ или JWT toggle).

## See also

- [new-vs-legacy-keys.md](new-vs-legacy-keys.md) — миграция ключей
- [direct-postgres-access.md](direct-postgres-access.md) — обход Edge Functions через прямой Postgres когда нужно
- Реальный пример: [azimer-site/supabase/functions/admin-api/index.ts](../../azimer-site/supabase/functions/admin-api/index.ts)
