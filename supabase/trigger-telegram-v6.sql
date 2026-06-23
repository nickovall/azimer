-- =====================================================
-- АЗИМЕР — Триггер v6
-- Шлёт ОДНОВРЕМЕННО:
--   1. Telegram Азамату (карточка с inline-кнопками статусов)
--   2. SMS клиенту через smsc.ru (если телефон валидный и source != 'kp_bot')
--
-- v6 (2026-06-24): «тихий» режим для ручных лидов.
--   Если source_channel = 'manual' — НЕ шлём ни Telegram, ни SMS.
--   Менеджер сам решает когда отправить SMS/КП из карточки лида.
--   Остальное поведение идентично v5.
--
-- Перед применением заменить плейсхолдеры:
--   __TELEGRAM_BOT_TOKEN__
--   __TELEGRAM_CHAT_ID__
--   __SMSC_LOGIN__
--   __SMSC_PASSWORD__
--   __SMSC_SENDER__         (рекомендуем AZIMER — после регистрации)
-- =====================================================

create or replace function public.notify_telegram_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bot_token   text := '__TELEGRAM_BOT_TOKEN__';
  chat_id     text := '__TELEGRAM_CHAT_ID__';

  smsc_login  text := '__SMSC_LOGIN__';
  smsc_psw    text := '__SMSC_PASSWORD__';
  smsc_sender text := '__SMSC_SENDER__';
  sms_text    text;
  phone_clean text;

  src_label   text;
  msg         text;
  est         jsonb;
  s           jsonb;
  low         numeric;
  high        numeric;
  buttons     jsonb;
  lead_id_txt text;
  origin_txt  text;
begin
  lead_id_txt := NEW.id::text;

  -- ───────────────────────────────────────────────────────────
  -- 1) TELEGRAM — пропускаем для заявок из бота (бот сам отвечает)
  --    и для ручных лидов (source_channel='manual') — «тихий» режим v6
  -- ───────────────────────────────────────────────────────────
  if NEW.source <> 'kp_bot' and NEW.source_channel is distinct from 'manual' then
    src_label := case NEW.source
      when 'contact'  then E'\U0001F4AC Контактная форма'
      when 'project'  then E'\U0001F4D0 Готовый проект'
      when 'partner'  then E'\U0001F91D Партнёрство'
      when 'estimate' then E'\U0001F9EE Мастер расчёта'
      else NEW.source
    end;

    msg := '<b>' || src_label || E'</b>  ·  \U0001F195 Новая\n\n' ||
           E'<b>Имя:</b> '     || coalesce(NEW.name,  '—') || E'\n' ||
           E'<b>Телефон:</b> <code>' || coalesce(NEW.phone, '—') || '</code>';

    if NEW.email       is not null then msg := msg || E'\n<b>Email:</b> '       || NEW.email;       end if;
    if NEW.client_type is not null then msg := msg || E'\n<b>Тип:</b> '         || NEW.client_type; end if;
    if NEW.company     is not null then msg := msg || E'\n<b>Компания:</b> '    || NEW.company;     end if;
    if NEW.direction   is not null then msg := msg || E'\n<b>Направление:</b> ' || NEW.direction;   end if;
    if NEW.object_type is not null then msg := msg || E'\n<b>Объект:</b> '      || NEW.object_type; end if;
    if NEW.message     is not null then msg := msg || E'\n\n<i>' || NEW.message || '</i>';          end if;

    if NEW.estimate is not null then
      est := NEW.estimate;
      s   := est -> 'state';
      low  := (est ->> 'low')::numeric;
      high := (est ->> 'high')::numeric;
      if low is not null and high is not null then
        msg := msg || E'\n\n<b>Оценка:</b> ' ||
          to_char(low,  'FM999G999G999') || ' ₽ — ' ||
          to_char(high, 'FM999G999G999') || ' ₽';
      end if;
      if s is not null then
        msg := msg || E'\n<b>Размеры:</b> '
                   || (s ->> 'length') || '×' || (s ->> 'width') || '×' || (s ->> 'height') || ' м';
      end if;
    end if;

    if NEW.files is not null and array_length(NEW.files, 1) > 0 then
      msg := msg || E'\n<b>Файлов:</b> ' || array_length(NEW.files, 1)::text;
    end if;

    origin_txt := '';
    if NEW.utm_source is not null then
      origin_txt := origin_txt || E'\n\U0001F4CD <b>Источник:</b> ' || NEW.utm_source;
      if NEW.utm_medium   is not null then origin_txt := origin_txt || ' / ' || NEW.utm_medium;   end if;
      if NEW.utm_campaign is not null then origin_txt := origin_txt || ' / ' || NEW.utm_campaign; end if;
    elsif NEW.referrer is not null then
      origin_txt := origin_txt || E'\n\U0001F310 <b>Откуда:</b> ' || NEW.referrer;
    end if;
    if NEW.landing_page is not null then
      origin_txt := origin_txt || E'\n\U0001F4C4 <b>Страница:</b> ' || NEW.landing_page;
    end if;
    if origin_txt <> '' then msg := msg || E'\n' || origin_txt; end if;

    msg := msg || E'\n\n<code>' || lead_id_txt || '</code>';

    buttons := jsonb_build_object(
      'inline_keyboard', jsonb_build_array(
        jsonb_build_array(
          jsonb_build_object('text', E'\U0001F7E1 Взял в работу', 'callback_data', 's:contacted:' || lead_id_txt),
          jsonb_build_object('text', E'\U0001F4C4 Отправил КП',   'callback_data', 's:kp_sent:'   || lead_id_txt)
        ),
        jsonb_build_array(
          jsonb_build_object('text', E'✅ Договор', 'callback_data', 's:won:'  || lead_id_txt),
          jsonb_build_object('text', E'❌ Отказ',   'callback_data', 's:lost:' || lead_id_txt)
        )
      )
    );

    perform net.http_post(
      url     := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
      body    := jsonb_build_object(
        'chat_id',                  chat_id,
        'text',                     msg,
        'parse_mode',               'HTML',
        'disable_web_page_preview', true,
        'reply_markup',             buttons
      ),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;

  -- ───────────────────────────────────────────────────────────
  -- 2) SMS КЛИЕНТУ через smsc.ru
  -- Шлём всегда (включая kp_bot — клиент должен знать что КП готово),
  -- КРОМЕ ручных лидов (source_channel='manual') — «тихий» режим v6.
  -- Защита от мусорных телефонов
  -- ───────────────────────────────────────────────────────────
  if NEW.phone is not null and length(smsc_login) > 5 and NEW.source_channel is distinct from 'manual' then
    -- Очищаем телефон: только цифры
    phone_clean := regexp_replace(NEW.phone, '\D', '', 'g');
    -- Если 11 цифр и начинается с 8 — заменяем на 7
    if length(phone_clean) = 11 and left(phone_clean, 1) = '8' then
      phone_clean := '7' || substr(phone_clean, 2);
    end if;
    -- Если 10 цифр — добавляем 7 спереди
    if length(phone_clean) = 10 then
      phone_clean := '7' || phone_clean;
    end if;

    -- Шлём только если получилось 11 цифр начинающихся с 7
    if length(phone_clean) = 11 and left(phone_clean, 1) = '7' then
      if NEW.source = 'kp_bot' then
        sms_text := 'AZIMER: Ваше КП готово, мы свяжемся в течение 24ч. Подробности на azimer.ru';
      else
        sms_text := 'AZIMER: спасибо за заявку! КП придёт в течение 24ч. azimer.ru';
      end if;

      perform net.http_get(
        url    := 'https://smsc.ru/sys/send.php',
        params := jsonb_build_object(
          'login',   smsc_login,
          'psw',     smsc_psw,
          'phones',  phone_clean,
          'mes',     sms_text,
          'sender',  smsc_sender,
          'charset', 'utf-8',
          'fmt',     '3'
        )
      );
    end if;
  end if;

  return NEW;
end;
$$;
