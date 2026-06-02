-- АЗИМЕР — Снапшот версии каталога цен в каждой заявке
-- Версия = CATALOG_VERSION из catalog.generated.ts на момент сборки сайта.
-- Если цены позже изменятся — по version можно восстановить контекст КП.

alter table public.leads
  add column if not exists catalog_version text;

comment on column public.leads.catalog_version is
  'CATALOG_VERSION (db-snapshot-YYYY-MM-DD-HHMM-sha6) на момент расчёта КП';

create index if not exists leads_catalog_version_idx
  on public.leads (catalog_version)
  where catalog_version is not null;
