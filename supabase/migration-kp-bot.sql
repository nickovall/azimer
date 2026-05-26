-- =====================================================
-- АЗИМЕР — Wizard КП через бота
-- 1) Расширяем check на source (добавляем 'kp_bot')
-- 2) Создаём таблицу kp_sessions для хранения состояния
-- =====================================================

-- 1. Разрешаем новый source
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('contact','project','partner','estimate','kp_bot'));

-- 2. Таблица сессий wizard'а
create table if not exists public.kp_sessions (
  id              uuid primary key default gen_random_uuid(),
  chat_id         bigint not null,
  started_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  status          text not null default 'collecting'
                    check (status in ('collecting','confirming','done','cancelled','expired')),
  current_step    text not null default 'client_name',
  collected       jsonb not null default '{}'::jsonb,
  last_question_message_id bigint,
  created_lead_id uuid references public.leads(id) on delete set null
);

create index if not exists kp_sessions_chat_active
  on public.kp_sessions (chat_id)
  where status = 'collecting' or status = 'confirming';

-- 3. Автоудаление протухших сессий (через 24 часа)
create or replace function public.expire_old_kp_sessions()
returns void
language sql as $$
  update public.kp_sessions
     set status = 'expired'
   where status in ('collecting','confirming')
     and updated_at < now() - interval '24 hours';
$$;

comment on table public.kp_sessions is
  'Состояние wizard-сессии генерации КП через Telegram-бота';
