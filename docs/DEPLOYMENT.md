# AZIMER Deployment Notes

GitLab Pages is the production deployment path.

## GitLab CI Order

1. `npm ci --prefer-offline --no-audit`
2. `npm run test:calculator`
3. `npm run typecheck`
4. `npm run build`
5. `npm run build:bot-bundle`
6. Deploy `telegram-bot`
7. Deploy `admin-api`
8. Publish static `out/` as GitLab Pages artifact

## Required GitLab CI Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ADMIN_GATE_KEY`
- `NEXT_PUBLIC_YANDEX_METRIKA_ID`
- Supabase CLI auth token/project variables required by `npx supabase functions deploy`

## Edge Function Notes

Both Supabase Edge Functions are deployed with `--no-verify-jwt` because they
perform their own controls:

- `admin-api` uses `login` plus a short-lived signed admin session token.
- `telegram-bot` requires `TELEGRAM_WEBHOOK_SECRET` in production. Public
  questionnaire commands are open to all users; admin commands and status
  callbacks are restricted to `ADMIN_CHAT_IDS` or legacy `ALLOWED_CHAT_IDS`.

## Legacy GitHub Pages

`.github/workflows/deploy.yml` is manual-only legacy fallback. It must not run on
push to `main`, otherwise it can race or diverge from GitLab Pages.
