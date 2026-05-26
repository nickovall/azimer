# АЗИМЕР — деплой интерактивного Telegram-бота

Бот:
- Шлёт карточку заявки в Telegram с inline-кнопками статусов
- Меняет статус заявки по нажатию кнопки (контакт / КП / договор / отказ)
- Команды: `/leads`, `/leads new`, `/leads contacted`, `/stats`, `/kp <id>`, `/help`

> ⚠️ **Безопасность:** реальные токены и chat_id храните локально вне Git
> (в `.env.local` или паролик), не коммитьте. В этом файле — только плейсхолдеры.

Архитектура:
```
Сайт → Supabase БД (INSERT) → pg_net trigger → Telegram (карточка с кнопками)
Юзер жмёт кнопку → Telegram webhook → Supabase Edge Function → UPDATE статус → редактирует сообщение
Юзер шлёт команду → Telegram webhook → Edge Function → читает БД → отвечает
```

---

## Шаг 1 — Применить новый триггер (Dashboard)

1. Открой `https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new`
2. Открой локально файл `supabase/trigger-telegram-v2.sql`
3. Замени плейсхолдеры на реальные значения:
   - `__TELEGRAM_BOT_TOKEN__` → токен бота (от @BotFather)
   - `__TELEGRAM_CHAT_ID__`   → chat_id владельца
4. Скопируй весь файл в SQL Editor → **Run**

Новые заявки начнут приходить с inline-кнопками.

---

## Шаг 2 — Создать Edge Function `telegram-bot`

### Вариант A — через Supabase CLI (рекомендуется)

```powershell
# Установка CLI один раз
scoop install supabase
# или https://github.com/supabase/cli/releases

supabase login
supabase link --project-ref <PROJECT_REF>

supabase secrets set TELEGRAM_BOT_TOKEN=<токен>
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<придуманная случайная строка>
supabase secrets set ALLOWED_CHAT_IDS=<chat_id через запятую>

cd "путь/к/azimer-site"
supabase functions deploy telegram-bot --no-verify-jwt
```

### Вариант Б — через Dashboard

1. `https://supabase.com/dashboard/project/<PROJECT_REF>/functions`
2. **«Create a new function»** или **«Deploy a new function»**
3. **Name:** `telegram-bot`
4. **Verify JWT:** ❌ **снять галку** (иначе Telegram не сможет вызвать)
5. Скопируй содержимое `supabase/functions/telegram-bot/index.ts` → вставь → **Deploy**

Затем секреты:
- `https://supabase.com/dashboard/project/<PROJECT_REF>/settings/functions`
- Раздел **Secrets** → добавить:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET`
  - `ALLOWED_CHAT_IDS`

---

## Шаг 3 — Прописать webhook в Telegram

После деплоя URL:
```
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot
```

Регистрация webhook:
```powershell
$TOKEN  = "<bot_token>"
$URL    = "https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot"
$SECRET = "<твой WEBHOOK_SECRET>"

curl.exe -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" `
  -H "Content-Type: application/json" `
  -d "{\`"url\`":\`"$URL\`",\`"secret_token\`":\`"$SECRET\`",\`"allowed_updates\`":[\`"message\`",\`"callback_query\`"]}"
```

Проверка:
```powershell
curl.exe "https://api.telegram.org/bot$TOKEN/getWebhookInfo"
```

---

## Шаг 4 — Проверка

В чате с ботом:
- `/start` — должен ответить списком команд
- `/leads` — пришлёт последние 10 заявок с кнопками
- `/stats` — статистика за 30 дней
- На карточке нажми **🟡 Взял в работу** — обновится, статус сменится в БД

---

## Если что-то не работает

Логи Edge Function:
```
https://supabase.com/dashboard/project/<PROJECT_REF>/functions/telegram-bot/logs
```

Логи webhook от Telegram:
```powershell
curl.exe "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
Покажет `last_error_date` и `last_error_message` если есть ошибки.

Снять webhook:
```powershell
curl.exe "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

---

## Кому что разрешено

Бот отвечает только тем chat_id что в `ALLOWED_CHAT_IDS`.

Чтоб добавить нового получателя — узнай его chat_id:
1. Получатель пишет боту любое сообщение
2. `curl.exe "https://api.telegram.org/bot<TOKEN>/getUpdates"`
3. Ищи `"from":{"id": ВОТ_ЭТО_ЧИСЛО}`

И добавь через запятую:
```
ALLOWED_CHAT_IDS=8614558675,123456789
```

---

## Ротация токена бота

Если токен утёк (например в публичный репо):
1. В @BotFather: `/token` → выбрать бота → подтвердить → получить новый
2. Старый токен сразу перестанет работать
3. Обновить везде:
   - Триггер в БД (через SQL Editor — перевыполнить `trigger-telegram-v2.sql` с новым токеном)
   - Edge Function secrets (`TELEGRAM_BOT_TOKEN`)
   - Webhook (`/setWebhook` с новым URL — он не меняется, но нужно перепрописать)
