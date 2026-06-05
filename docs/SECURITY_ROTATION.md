# AZIMER Security Rotation

Date: 2026-06-05

Rotate these values after the technical audit. Do not store real values in this
repository.

## Rotate Now

- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` if it was exposed outside Supabase secrets
- `SUPABASE_ACCESS_TOKEN`
- `GITLAB_TRIGGER_TOKEN`
- GitLab personal/project access tokens used for deploy automation
- Supabase Postgres password
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `SMSC_PSW`
- `RESEND_API_KEY` if email sending was configured with a live key
- `NEXT_PUBLIC_ADMIN_GATE_KEY` because the previous gate key lived in source

## Do Not Rotate Solely Because Of This Audit

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_YANDEX_METRIKA_ID`
- `SITE_URL`

These values are public/client-facing by design. Rotation is only needed if
their backing policies or project configuration were also compromised.

## Required Supabase Function Secrets

`admin-api`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `SITE_URL`
- `ADMIN_ALLOWED_ORIGINS` if additional non-local origins are needed
- `GITLAB_TRIGGER_TOKEN`
- `GITLAB_PROJECT_ID`
- messaging provider secrets only if SMS/email sending is enabled

`telegram-bot`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_CHAT_IDS` (or legacy `ALLOWED_CHAT_IDS`)
- `SITE_URL`

Public questionnaire commands are open to all Telegram users. Admin commands must
fail closed unless the chat id is listed in `ADMIN_CHAT_IDS` or legacy
`ALLOWED_CHAT_IDS`.
