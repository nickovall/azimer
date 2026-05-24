-- =====================================================
-- АЗИМЕР — схема таблицы заявок
-- Применить через Supabase Dashboard → SQL Editor → New query → paste → Run
-- =====================================================

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  source       text not null check (source in ('contact','project','partner','estimate')),
  status       text not null default 'new' check (status in ('new','contacted','kp_sent','won','lost')),

  -- общие поля контакта
  client_type  text,    -- "Частное лицо" / "Компания или ИП"
  name         text not null,
  phone        text not null,
  email        text,

  -- расширенные поля по формам
  company      text,    -- партнёрство
  direction    text,    -- партнёрство: направление сотрудничества
  object_type  text,    -- проект: тип объекта (текст)
  message      text,    -- описание / сообщение

  -- калькулятор и файлы
  estimate     jsonb,   -- {state, lines, low, high, area, wallArea}
  files        text[]   -- массив signed URL загруженных файлов
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_source_idx     on public.leads (source);

-- =====================================================
-- Row Level Security
-- =====================================================
alter table public.leads enable row level security;

-- Браузер с anon-ключом может только ВСТАВИТЬ заявку.
create policy "anyone can insert leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Чтение/обновление — только под авторизацией (для будущей админки).
create policy "auth can read leads"
  on public.leads for select
  to authenticated using (true);

create policy "auth can update leads"
  on public.leads for update
  to authenticated using (true);

-- =====================================================
-- Storage bucket для файлов (чертежи и т.п.)
-- =====================================================
insert into storage.buckets (id, name, public)
values ('lead-files', 'lead-files', false)
on conflict (id) do nothing;

create policy "anyone can upload to lead-files"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'lead-files');

create policy "auth can read lead-files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-files');
