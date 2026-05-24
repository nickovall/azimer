-- =====================================================
-- АЗИМЕР — Триггер на INSERT в leads → Telegram
-- Применяется ПОСЛЕ schema.sql, когда есть bot_token + chat_id.
-- Перед применением заменить плейсхолдеры __TELEGRAM_BOT_TOKEN__
-- и __TELEGRAM_CHAT_ID__ на реальные значения.
-- =====================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_telegram_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bot_token  text := '__TELEGRAM_BOT_TOKEN__';
  chat_id    text := '__TELEGRAM_CHAT_ID__';
  src_label  text;
  msg        text;
  est        jsonb;
  s          jsonb;
  low        numeric;
  high       numeric;
begin
  -- маппинг источника
  src_label := case NEW.source
    when 'contact'  then E'\U0001F4AC Контактная форма'
    when 'project'  then E'\U0001F4D0 Расчёт по готовому проекту'
    when 'partner'  then E'\U0001F91D Партнёрство'
    when 'estimate' then E'\U0001F9EE Мастер расчёта'
    else NEW.source
  end;

  -- основное тело
  msg := '<b>' || src_label || E'</b>\n\n' ||
         E'<b>Имя:</b> '     || coalesce(NEW.name,  '—') || E'\n' ||
         E'<b>Телефон:</b> <code>' || coalesce(NEW.phone, '—') || '</code>';

  if NEW.email       is not null then msg := msg || E'\n<b>Email:</b> '       || NEW.email;       end if;
  if NEW.client_type is not null then msg := msg || E'\n<b>Тип:</b> '         || NEW.client_type; end if;
  if NEW.company     is not null then msg := msg || E'\n<b>Компания:</b> '    || NEW.company;     end if;
  if NEW.direction   is not null then msg := msg || E'\n<b>Направление:</b> ' || NEW.direction;   end if;
  if NEW.object_type is not null then msg := msg || E'\n<b>Объект:</b> '      || NEW.object_type; end if;
  if NEW.message     is not null then msg := msg || E'\n\n<i>' || NEW.message || '</i>';          end if;

  -- расчёт
  if NEW.estimate is not null then
    est := NEW.estimate;
    s   := est -> 'state';
    low  := (est ->> 'low')::numeric;
    high := (est ->> 'high')::numeric;
    msg := msg || E'\n\n<b>Параметры расчёта:</b>';
    if s is not null then
      msg := msg || E'\n• Размеры: ' || (s ->> 'length') || '×' || (s ->> 'width') || '×' || (s ->> 'height') || ' м';
      if s ->> 'objectType' is not null then msg := msg || E'\n• Объект: ' || (s ->> 'objectType'); end if;
      if s ->> 'frame'      is not null then msg := msg || E'\n• Каркас: ' || (s ->> 'frame');      end if;
      if s ->> 'cladding'   is not null then msg := msg || E', стены: '    || (s ->> 'cladding');   end if;
      if s ->> 'roofing'    is not null then msg := msg || E', кровля: '   || (s ->> 'roofing');    end if;
      if s ->> 'foundation' is not null and s ->> 'foundation' <> 'none' then
        msg := msg || E'\n• Фундамент: ' || (s ->> 'foundation');
      end if;
    end if;
    if low is not null and high is not null then
      msg := msg || E'\n<b>Оценка:</b> ' ||
        to_char(low,  'FM999G999G999') || ' ₽ — ' ||
        to_char(high, 'FM999G999G999') || ' ₽';
    end if;
  end if;

  -- файлы
  if NEW.files is not null and array_length(NEW.files, 1) > 0 then
    msg := msg || E'\n\n<b>Файлов:</b> ' || array_length(NEW.files, 1)::text;
  end if;

  msg := msg || E'\n\n<code>' || NEW.id::text || '</code>';

  -- отправка
  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body    := jsonb_build_object(
      'chat_id',                  chat_id,
      'text',                     msg,
      'parse_mode',               'HTML',
      'disable_web_page_preview', true
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  return NEW;
end;
$$;

drop trigger if exists leads_notify_telegram on public.leads;

create trigger leads_notify_telegram
  after insert on public.leads
  for each row
  execute function public.notify_telegram_new_lead();
