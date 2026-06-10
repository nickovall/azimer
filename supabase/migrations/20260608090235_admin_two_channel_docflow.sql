-- AZIMER admin MVP: two sales channels, document links, tender commissions.
-- Public site keeps inserting safe site leads only. Admin Edge Function uses
-- service_role for the operational fields and private tables below.

create sequence if not exists public.lead_code_seq;

alter table public.leads
  add column if not exists source_channel text not null default 'site',
  add column if not exists lead_code text,
  add column if not exists external_source text,
  add column if not exists external_source_url text,
  add column if not exists created_by_system text,
  add column if not exists deal_status text not null default 'new',
  add column if not exists project_folder_url text,
  add column if not exists kp_status text not null default 'not_started',
  add column if not exists contract_status text not null default 'not_started',
  add column if not exists invoice_status text not null default 'not_issued',
  add column if not exists payment_status text not null default 'not_paid',
  add column if not exists commission_eligible boolean not null default false,
  add column if not exists commission_rate numeric(6, 4) not null default 0,
  add column if not exists commission_notes text;

alter table public.leads drop constraint if exists leads_source_channel_check;
alter table public.leads add constraint leads_source_channel_check
  check (source_channel in ('site', 'tender', 'manual'));

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in (
    'new',
    'contacted',
    'accepted',
    'measurement_done',
    'tz_received',
    'kp_preparing',
    'kp_sent',
    'kp_approved',
    'sent_to_accountant',
    'invoice_issued',
    'paid_partial',
    'paid_full',
    'won',
    'lost',
    'commission_paid'
  ));

alter table public.leads drop constraint if exists leads_deal_status_check;
alter table public.leads add constraint leads_deal_status_check
  check (deal_status in (
    'new',
    'contacted',
    'accepted',
    'measurement_done',
    'tz_received',
    'kp_preparing',
    'kp_sent',
    'kp_approved',
    'sent_to_accountant',
    'invoice_issued',
    'paid_partial',
    'paid_full',
    'won',
    'lost',
    'commission_paid'
  ));

alter table public.leads drop constraint if exists leads_doc_statuses_check;
alter table public.leads add constraint leads_doc_statuses_check
  check (
    kp_status in ('not_started', 'preparing', 'sent', 'approved')
    and contract_status in ('not_started', 'drafting', 'sent', 'signed')
    and invoice_status in ('not_issued', 'issued')
    and payment_status in ('not_paid', 'partial', 'paid')
  );

alter table public.leads drop constraint if exists leads_commission_rate_check;
alter table public.leads add constraint leads_commission_rate_check
  check (commission_rate >= 0 and commission_rate <= 1);

alter table public.leads drop constraint if exists leads_external_source_url_check;
alter table public.leads add constraint leads_external_source_url_check
  check (external_source_url is null or external_source_url ~* '^https?://');

alter table public.leads drop constraint if exists leads_project_folder_url_check;
alter table public.leads add constraint leads_project_folder_url_check
  check (project_folder_url is null or project_folder_url ~* '^https?://');

create unique index if not exists leads_lead_code_uniq
  on public.leads (lead_code)
  where lead_code is not null;

create index if not exists leads_source_channel_idx on public.leads (source_channel);
create index if not exists leads_deal_status_idx on public.leads (deal_status);
create index if not exists leads_commission_eligible_idx on public.leads (commission_eligible)
  where commission_eligible = true;

create or replace function public.make_lead_code(
  p_source_channel text,
  p_created_at timestamptz,
  p_seq bigint
)
returns text
language sql
stable
as $$
  select (
    case p_source_channel
      when 'tender' then 'TEN'
      when 'manual' then 'MAN'
      else 'WEB'
    end
    || '-' || to_char(coalesce(p_created_at, now()), 'YYYYMMDD')
    || '-' || lpad(p_seq::text, 6, '0')
  )
$$;

create or replace function public.trg_set_lead_operational_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if NEW.source_channel is null or NEW.source_channel = '' then
    NEW.source_channel := 'site';
  end if;

  if NEW.deal_status is null or NEW.deal_status = '' then
    NEW.deal_status := coalesce(NEW.status, 'new');
  end if;

  if NEW.lead_code is null or NEW.lead_code = '' then
    NEW.lead_code := public.make_lead_code(
      NEW.source_channel,
      coalesce(NEW.created_at, now()),
      nextval('public.lead_code_seq'::regclass)
    );
  end if;

  if NEW.source_channel = 'tender'
     and NEW.commission_eligible
     and coalesce(NEW.commission_rate, 0) = 0 then
    NEW.commission_rate := 0.0500;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_set_lead_operational_defaults on public.leads;
create trigger trg_set_lead_operational_defaults
  before insert on public.leads
  for each row execute function public.trg_set_lead_operational_defaults();

update public.leads
   set source_channel = coalesce(nullif(source_channel, ''), 'site'),
       deal_status = coalesce(nullif(deal_status, ''), status, 'new'),
       kp_status = case
         when status in ('kp_sent', 'kp_approved') then 'sent'
         else coalesce(nullif(kp_status, ''), 'not_started')
       end,
       invoice_status = case
         when status in ('invoice_issued', 'paid_partial', 'paid_full', 'won') then 'issued'
         else coalesce(nullif(invoice_status, ''), 'not_issued')
       end,
       payment_status = case
         when status = 'paid_partial' then 'partial'
         when status in ('paid_full', 'won') then 'paid'
         else coalesce(nullif(payment_status, ''), 'not_paid')
       end;

update public.leads
   set lead_code = public.make_lead_code(
     source_channel,
     created_at,
     nextval('public.lead_code_seq'::regclass)
   )
 where lead_code is null;

create table if not exists public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  lead_code text,
  created_at timestamptz not null default now(),
  doc_type text not null,
  title text not null,
  file_url text,
  storage_provider text not null default 'google_drive',
  storage_path text,
  amount numeric(14, 2),
  currency text not null default 'RUB',
  uploaded_by text,
  sent_to_accountant_at timestamptz,
  notes text,
  constraint lead_documents_doc_type_check
    check (doc_type in ('tz', 'kp', 'contract', 'invoice', 'act', 'payment', 'mail', 'drawing', 'other')),
  constraint lead_documents_storage_provider_check
    check (storage_provider in ('google_drive', 'supabase', 'other')),
  constraint lead_documents_file_url_check
    check (file_url is null or file_url ~* '^https?://'),
  constraint lead_documents_currency_check
    check (currency in ('RUB'))
);

create index if not exists lead_documents_lead_idx
  on public.lead_documents (lead_id, created_at desc);
create index if not exists lead_documents_doc_type_idx
  on public.lead_documents (doc_type);

alter table public.lead_documents enable row level security;
revoke all on table public.lead_documents from anon, authenticated;

create table if not exists public.deal_commissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  lead_code text,
  commission_rate numeric(6, 4) not null default 0.0500,
  kp_amount numeric(14, 2) not null default 0,
  invoice_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  commission_due numeric(14, 2) generated always as (round(paid_amount * commission_rate, 2)) stored,
  commission_paid numeric(14, 2) not null default 0,
  payment_status text not null default 'not_paid',
  notes text,
  updated_at timestamptz not null default now(),
  constraint deal_commissions_rate_check
    check (commission_rate >= 0 and commission_rate <= 1),
  constraint deal_commissions_amounts_check
    check (kp_amount >= 0 and invoice_amount >= 0 and paid_amount >= 0 and commission_paid >= 0),
  constraint deal_commissions_payment_status_check
    check (payment_status in ('not_paid', 'partial', 'paid'))
);

create index if not exists deal_commissions_payment_status_idx
  on public.deal_commissions (payment_status);

create or replace function public.trg_touch_deal_commissions()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_touch_deal_commissions on public.deal_commissions;
create trigger trg_touch_deal_commissions
  before update on public.deal_commissions
  for each row execute function public.trg_touch_deal_commissions();

alter table public.deal_commissions enable row level security;
revoke all on table public.deal_commissions from anon, authenticated;

comment on column public.leads.source_channel is
  'Sales channel: site, tender, or manual. Public forms default to site.';
comment on column public.leads.lead_code is
  'Stable human-readable Lead ID shown in the admin pipeline.';
comment on table public.lead_documents is
  'MVP document registry. Files live in Google Drive/Supabase/etc.; this table stores links and metadata.';
comment on table public.deal_commissions is
  'Tender commission ledger. Admin API maintains rows for commission-eligible tender leads.';
