-- AZIMER public access hardening.
-- Generated after the 2026-06-05 technical audit.
-- Does not contain secret values.

-- =====================================================
-- kp_sessions: bot state must not be publicly readable.
-- Bot/admin Edge Functions use service_role and bypass RLS.
-- =====================================================

alter table if exists public.kp_sessions enable row level security;

drop policy if exists "kp_sessions public read" on public.kp_sessions;
drop policy if exists "kp_sessions public insert" on public.kp_sessions;
drop policy if exists "kp_sessions public update" on public.kp_sessions;
drop policy if exists "kp_sessions public delete" on public.kp_sessions;
drop policy if exists "kp_sessions auth read" on public.kp_sessions;
drop policy if exists "kp_sessions auth insert" on public.kp_sessions;
drop policy if exists "kp_sessions auth update" on public.kp_sessions;
drop policy if exists "kp_sessions auth delete" on public.kp_sessions;

revoke all on table public.kp_sessions from anon, authenticated;

-- =====================================================
-- leads: public clients may create new leads only.
-- Server-owned fields must stay at DB defaults/null.
-- =====================================================

create or replace function public.is_safe_lead_file_paths(paths text[])
returns boolean
language sql
immutable
as $$
  select paths is null
      or (
        cardinality(paths) <= 10
        and not exists (
          select 1
            from unnest(paths) as p(path)
           where path is null
              or path = ''
              or path not like 'lead-uploads/%'
              or path like 'http%'
        )
      )
$$;

alter table public.leads enable row level security;

drop policy if exists "anyone can insert leads" on public.leads;
drop policy if exists "auth can read leads" on public.leads;
drop policy if exists "auth can update leads" on public.leads;
drop policy if exists "public can insert safe leads" on public.leads;

create policy "public can insert safe leads"
  on public.leads for insert
  to anon, authenticated
  with check (
    source in ('contact','project','partner','estimate')
    and status = 'new'
    and notes is null
    and status_updated_at is null
    and catalog_version is null
    and public.is_safe_lead_file_paths(files)
  );

revoke insert on public.leads from anon, authenticated;
grant insert (
  source,
  client_type,
  name,
  phone,
  email,
  company,
  direction,
  object_type,
  message,
  estimate,
  files,
  utm_source,
  utm_medium,
  utm_campaign,
  utm_content,
  utm_term,
  referrer,
  landing_page
) on public.leads to anon, authenticated;

revoke select, update, delete on public.leads from anon, authenticated;

-- Keep project uploads scoped to the path that the frontend writes.
drop policy if exists "anyone can upload to lead-files" on storage.objects;
create policy "public can upload lead files"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'lead-files'
    and name like 'lead-uploads/%'
  );

-- =====================================================
-- catalog_items: only one active price per category/key.
-- If this fails on an existing database, resolve duplicate active rows first.
-- =====================================================

create unique index if not exists catalog_items_one_active_per_key
  on public.catalog_items (category, key)
  where valid_to is null;
