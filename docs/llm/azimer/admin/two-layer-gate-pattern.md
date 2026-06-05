# Двухслойный gate для админки на static-сайте

## TL;DR

На static-export сайте нет middleware перед страницей. Для AZIMER используется
двухслойная модель:

1. Случайный URL + `?k=<gate-key>` скрывает админку от случайного посетителя.
2. `admin-api` проверяет `ADMIN_PASSWORD` только на `action=login`.
3. После login Edge Function выдаёт короткоживущий signed admin token.
4. Все privileged actions идут с `Authorization: Bearer <token>`.

Пароль нельзя хранить в browser storage и нельзя передавать в body каждого admin
action.

## Инварианты

- `GATE_KEY` не является криптографической защитой и попадает в JS bundle.
- Настоящая защита находится в `admin-api`.
- `ADMIN_PASSWORD` хранится только в Supabase Edge Function secrets.
- `ADMIN_SESSION_SECRET` хранится только в Supabase Edge Function secrets.
- `admin-api` CORS ограничен `SITE_URL` и localhost dev, не `*`.
- Token имеет expiry и проверяется на каждом privileged action.

## Client Flow

```tsx
// components/admin/AdminShell.tsx
// 1. URL gate passed.
// 2. User enters password.
// 3. Client calls adminLogin(password).
// 4. Client stores only short-lived admin_token + admin_token_exp.
// 5. adminFetch(token, payload) sends Authorization: Bearer <token>.
```

## Edge Function Flow

```ts
// supabase/functions/admin-api/index.ts
if (action === "login") {
  // Compare password with ADMIN_PASSWORD.
  // Return signed token with exp.
}

// Every other action:
// require Authorization: Bearer <signed-admin-token>
```

## Secrets

| Name | Storage |
|---|---|
| `ADMIN_PASSWORD` | Supabase Edge Function secrets only |
| `ADMIN_SESSION_SECRET` | Supabase Edge Function secrets only |
| `SITE_URL` | Supabase Edge Function secret/config |
| `ADMIN_ALLOWED_ORIGINS` | Optional comma-separated non-local origins |

## Verification

- Open `/console-x9p4m2/` without `?k=` in an incognito tab: should render 404.
- Login request sends `password` only to `action=login`.
- Subsequent admin requests contain no password and include bearer token.
- `admin-api` without bearer token returns 401 for privileged actions.
- Disallowed browser origins are rejected by CORS.
