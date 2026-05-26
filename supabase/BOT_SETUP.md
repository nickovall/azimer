# АЗИМЕР — деплой интерактивного Telegram-бота

Бот:
- Шлёт карточку заявки в Telegram с inline-кнопками статусов
- Меняет статус заявки по нажатию кнопки (контакт / КП / договор / отказ)
- Команды: `/leads`, `/leads new`, `/leads contacted`, `/stats`, `/kp <id>`, `/help`

Архитектура:
```
Сайт → Supabase БД (INSERT) → pg_net trigger → Telegram (карточка с кнопками)
Юзер жмёт кнопку → Telegram webhook → Supabase Edge Function → UPDATE статус → редактирует сообщение
Юзер шлёт команду → Telegram webhook → Edge Function → читает БД → отвечает
```

---

## Шаг 1 — Применить новый триггер (Dashboard, без CLI)

1. Открой `https://supabase.com/dashboard/project/objgpsjyftdrhafapwvw/sql/new`
2. Открой локально файл `supabase/trigger-telegram-v2.sql`
3. Замени плейсхолдеры на реальные значения:
   - `__TELEGRAM_BOT_TOKEN__` → `8981076319:AAH1QB92Vd-PlBRKsu_gS8SZKaRXapNFFbM`
   - `__TELEGRAM_CHAT_ID__`   → `8614558675` (chat_id Азамата)
4. Скопируй весь файл в SQL Editor → **Run**
5. Должно ответить `Success`

После этого новые заявки начнут приходить с кнопками.

---

## Шаг 2 — Создать Edge Function `telegram-bot`

### Вариант A — через Supabase CLI (надёжнее)

Установи CLI (один раз):
```powershell
# Windows (через scoop)
scoop install supabase

# или скачай бинарник с https://github.com/supabase/cli/releases
```

Залогинься и привяжи проект:
```powershell
supabase login
supabase link --project-ref objgpsjyftdrhafapwvw
```

Установи секреты:
```powershell
supabase secrets set TELEGRAM_BOT_TOKEN=8981076319:AAH1QB92Vd-PlBRKsu_gS8SZKaRXapNFFbM
supabase secrets set TELEGRAM_WEBHOOK_SECRET=azimer-secret-2026-XYZ
supabase secrets set ALLOWED_CHAT_IDS=8614558675
# SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY уже доступны автоматически
```

Деплой функции:
```powershell
cd "B:\MyProjects\Azamat's project automation\azimer-site"
supabase functions deploy telegram-bot --no-verify-jwt
```

### Вариант Б — через Dashboard (если не хочешь ставить CLI)

1. `https://supabase.com/dashboard/project/objgpsjyftdrhafapwvw/functions`
2. Кнопка **«Create a new function»**
3. **Name:** `telegram-bot`
4. **Verify JWT:** ОТКЛЮЧИ (галка снята) — иначе Telegram не сможет вызвать
5. Скопируй содержимое `supabase/functions/telegram-bot/index.ts` → вставь в редактор
6. **Deploy**

Затем добавь секреты:
- `https://supabase.com/dashboard/project/objgpsjyftdrhafapwvw/settings/functions`
- Раздел **Secrets** → добавить:
  - `TELEGRAM_BOT_TOKEN` = `8981076319:AAH1QB92Vd-PlBRKsu_gS8SZKaRXapNFFbM`
  - `TELEGRAM_WEBHOOK_SECRET` = `azimer-secret-2026-XYZ` (придумай своё)
  - `ALLOWED_CHAT_IDS` = `8614558675`

---

## Шаг 3 — Прописать webhook в Telegram

После деплоя функции — её URL:
```
https://objgpsjyftdrhafapwvw.supabase.co/functions/v1/telegram-bot
```

Зарегистрируй webhook (один раз, из любого терминала):
```powershell
curl -X POST "https://api.telegram.org/bot8981076319:AAH1QB92Vd-PlBRKsu_gS8SZKaRXapNFFbM/setWebhook" `
  -H "Content-Type: application/json" `
  -d '{\"url\":\"https://objgpsjyftdrhafapwvw.supabase.co/functions/v1/telegram-bot\",\"secret_token\":\"azimer-secret-2026-XYZ\",\"allowed_updates\":[\"message\",\"callback_query\"]}'
```

Проверь что прописался:
```powershell
curl "https://api.telegram.org/bot8981076319:AAH1QB92Vd-PlBRKsu_gS8SZKaRXapNFFbM/getWebhookInfo"
```

Должно вернуть `"url": "https://objgpsjyftdrhafapwvw.supabase.co/functions/v1/telegram-bot"`.

---

## Шаг 4 — Проверка

В Telegram-чате с ботом (где сейчас приходят карточки) отправь:
- `/start` — бот должен ответить списком команд
- `/leads` — должны прийти последние 10 заявок с кнопками
- `/stats` — статистика за 30 дней
- На любой карточке нажми **🟡 Взял в работу** — карточка должна обновиться, статус смениться в БД

Проверь в Supabase Dashboard → Table Editor → leads → колонка `status` должна обновиться на `contacted`.

---

## Если что-то не работает

Логи Edge Function:
```
https://supabase.com/dashboard/project/objgpsjyftdrhafapwvw/functions/telegram-bot/logs
```

Логи webhook от Telegram:
```powershell
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
Покажет `last_error_date` и `last_error_message` если есть ошибки.

Снять webhook временно:
```powershell
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

---

## Кому что разрешено

Бот отвечает только тем chat_id что в `ALLOWED_CHAT_IDS`. Сейчас там только Азамат (`8614558675`).

Чтоб добавить себя (Николая) или ещё кого — узнай свой chat_id:
1. Напиши боту любое сообщение
2. Открой `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Найди `"from":{"id": ВОТ_ЭТО_ЧИСЛО}`

И добавь его в `ALLOWED_CHAT_IDS` через запятую:
```
ALLOWED_CHAT_IDS=8614558675,123456789
```
