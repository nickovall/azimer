# Supabase — инструкция применения

## 1. Накатить схему

Supabase Dashboard → **SQL Editor** → **New query** → вставить содержимое
`schema.sql` → **Run**. Создаст таблицу `leads`, индексы, RLS-политики и
storage-бакет `lead-files`.

## 2. Задать секреты для Edge Function

Project Settings → **Edge Functions** → **Secrets** → добавить:

- `TELEGRAM_BOT_TOKEN` — токен из @BotFather, формат `7123456789:AAH…`
- `TELEGRAM_CHAT_ID`   — ID чата получателя (число)

## 3. Задеплоить функцию

Локально через Supabase CLI (один раз):

```
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy notify-telegram --no-verify-jwt
```

`--no-verify-jwt` нужен — webhook вызывает функцию без JWT.

## 4. Подключить webhook (БД → функция)

Database → **Webhooks** → **Create new hook**:

- Name: `lead-to-telegram`
- Table: `public.leads`
- Events: ✅ `Insert`
- Type: **Supabase Edge Function**
- Edge Function: `notify-telegram`
- HTTP Method: `POST`
- Timeout: 1000 ms

Сохранить. Готово — теперь при любом INSERT в `leads` функция шлёт
сообщение в Telegram.

## 5. Подключить сайт

В `.env.local` (и в Vercel → Environment Variables) задать:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
```

Пересобрать и задеплоить сайт. Формы автоматически пойдут писать в Supabase.

## Где Азамат видит заявки

- Supabase Dashboard → **Table Editor** → `leads` (фильтр по `status='new'`)
- Параллельно — Telegram-бот шлёт каждую новую заявку
- Status можно менять в админке: `new → contacted → kp_sent → won/lost`
