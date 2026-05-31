-- =====================================================
-- АЗИМЕР — Каталог цен в БД с историей версий
-- Когда придут прайсы от поставщиков — обновлять через INSERT
-- (старая запись помечается valid_to, новая получает valid_from = now())
-- =====================================================

-- Категории для группировки
create table if not exists public.catalog_categories (
  id    text primary key,                      -- 'sandwich' | 'metal' | 'foundation' | 'hardware' | 'works' | 'openings'
  label text not null,
  sort_order int default 0
);

insert into public.catalog_categories (id, label, sort_order) values
  ('sandwich',     'Сэндвич-панели',         1),
  ('proflist',     'Профлист',                2),
  ('trim',         'Фасонные элементы',       3),
  ('hardware',     'Крепёж и расходники',     4),
  ('metal',        'Металлопрокат',           5),
  ('foundation',   'Фундамент (материалы)',   6),
  ('openings',     'Доборные (ворота/окна)',  7),
  ('works',        'Работы (расценки СМР)',   8),
  ('interior',     'Внутренние работы',       9),
  ('finance',      'Финансовые параметры',   10)
on conflict (id) do nothing;

-- Сам каталог — key-value с историей
create table if not exists public.catalog_items (
  id         uuid primary key default gen_random_uuid(),
  category   text not null references public.catalog_categories(id) on delete restrict,
  key        text not null,                    -- 'wall_minvata_150' | 'screw_sandwich_185' и т.д.
  label      text not null,                    -- человеко-читаемое название
  unit       text not null,                    -- '₽/м²' | '₽/шт' | '₽/тонна' | 'pct' | 'factor'
  price      numeric not null,                 -- значение
  vendor     text,                             -- поставщик (если есть)
  comment    text,                             -- примечание
  valid_from timestamptz not null default now(),
  valid_to   timestamptz,                      -- null = действующая запись
  source     text default 'baseline_market',   -- 'baseline_market' | 'azamat_partner' | 'manual'
  created_at timestamptz not null default now(),
  created_by text default 'system'
);

create index if not exists catalog_items_active_idx
  on public.catalog_items (category, key) where valid_to is null;

create index if not exists catalog_items_history_idx
  on public.catalog_items (category, key, valid_from desc);

-- Функция для получения АКТУАЛЬНОЙ цены позиции
create or replace function public.get_catalog_price(p_category text, p_key text)
returns numeric
language sql stable as $$
  select price
    from public.catalog_items
   where category = p_category
     and key      = p_key
     and valid_to is null
   limit 1
$$;

-- Функция для ОБНОВЛЕНИЯ цены (закрывает старую, создаёт новую)
create or replace function public.update_catalog_price(
  p_category text, p_key text, p_label text,
  p_unit text, p_price numeric,
  p_vendor text default null, p_source text default 'manual'
) returns uuid
language plpgsql as $$
declare
  new_id uuid;
begin
  -- Закрываем все актуальные записи для этого ключа
  update public.catalog_items
     set valid_to = now()
   where category = p_category
     and key      = p_key
     and valid_to is null;

  -- Вставляем новую
  insert into public.catalog_items (category, key, label, unit, price, vendor, source)
  values (p_category, p_key, p_label, p_unit, p_price, p_vendor, p_source)
  returning id into new_id;

  return new_id;
end;
$$;

-- View с актуальными ценами (удобно для JOIN'ов и админки)
create or replace view public.catalog_current as
  select category, key, label, unit, price, vendor, comment, valid_from, source
    from public.catalog_items
   where valid_to is null;

-- RLS — публичный READ для site/bot, WRITE только service_role
alter table public.catalog_items enable row level security;
alter table public.catalog_categories enable row level security;

drop policy if exists "catalog_items public read" on public.catalog_items;
create policy "catalog_items public read"
  on public.catalog_items for select
  using (true);

drop policy if exists "catalog_categories public read" on public.catalog_categories;
create policy "catalog_categories public read"
  on public.catalog_categories for select
  using (true);

comment on table public.catalog_items is
  'Каталог цен с историей версий. Актуальные записи — valid_to is null.';
