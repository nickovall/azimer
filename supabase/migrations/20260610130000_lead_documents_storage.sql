-- AZIMER admin: Supabase Storage bucket для документов сделки.
-- Файлы кладутся как {lead_code}/{folder_key}/{timestamp}_{filename}.
-- folder_key мапится из lead_documents.doc_type:
--   tz → 01_TZ
--   kp → 02_KP_i_smety
--   contract → 03_Dogovory
--   invoice → 04_Scheta
--   act → 05_Akty
--   payment → 06_Oplaty
--   mail → 07_Perepiska
--   drawing → 08_Foto_i_chertezhi
--   other → 99_Other
--
-- Доступ к файлам — только через admin-api Edge Function (service role).
-- Браузер заливает по signed upload URL (выдаёт admin-api). Anon/authenticated
-- НЕ имеют прямого доступа к bucket'у.

-- Колонка для bucket'а (Codex'овская миграция её не предусмотрела —
-- по умолчанию там storage_provider='google_drive').
alter table public.lead_documents
  add column if not exists storage_bucket text,
  add column if not exists file_size_bytes bigint,
  add column if not exists file_mime text,
  add column if not exists original_filename text;

-- Расширяем storage_provider до включения supabase
alter table public.lead_documents drop constraint if exists lead_documents_storage_provider_check;
alter table public.lead_documents add constraint lead_documents_storage_provider_check
  check (storage_provider in ('google_drive', 'supabase', 'other'));

insert into storage.buckets (id, name, public, file_size_limit)
values ('lead-documents', 'lead-documents', false, 52428800)  -- 50 MB на файл
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800;

-- service_role в Edge Function обходит RLS — отдельные политики не нужны.
-- Существующие политики из других bucket'ов (lead-files, sales-documents) не задеты.

comment on column public.lead_documents.storage_bucket is
  'Supabase Storage bucket: lead-documents для админских загрузок, lead-files для файлов с сайта.';
