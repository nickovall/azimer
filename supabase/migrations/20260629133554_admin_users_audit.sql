-- AZIMER admin users + action audit.
-- Existing ADMIN_PASSWORD remains a legacy owner fallback in admin-api, but new
-- manager/broker profiles live here so actions can be attributed.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  login text not null unique,
  display_name text not null,
  phone text,
  email text,
  role text not null default 'manager',
  password_hash text not null,
  is_active boolean not null default true,
  notes text,
  constraint admin_users_login_check
    check (login = lower(login) and login ~ '^[a-z0-9._-]{3,64}$'),
  constraint admin_users_role_check
    check (role in ('owner', 'manager')),
  constraint admin_users_display_name_check
    check (length(btrim(display_name)) > 0),
  constraint admin_users_password_hash_check
    check (password_hash ~ '^pbkdf2_sha256\\$[0-9]+\\$[A-Za-z0-9_-]+\\$[A-Za-z0-9_-]+$')
);

create index if not exists admin_users_active_idx
  on public.admin_users (is_active, role, display_name);

create or replace function public.trg_touch_admin_users()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists trg_touch_admin_users on public.admin_users;
create trigger trg_touch_admin_users
  before update on public.admin_users
  for each row execute function public.trg_touch_admin_users();

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select, insert, update on table public.admin_users to service_role;

alter table public.leads
  add column if not exists assigned_manager_id uuid references public.admin_users(id) on delete set null,
  add column if not exists assigned_manager_name text;

create index if not exists leads_assigned_manager_idx
  on public.leads (assigned_manager_id)
  where assigned_manager_id is not null;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid references public.admin_users(id) on delete set null,
  actor_login text,
  actor_name text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  lead_id uuid references public.leads(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  constraint admin_audit_events_actor_role_check
    check (actor_role is null or actor_role in ('owner', 'manager')),
  constraint admin_audit_events_action_check
    check (length(btrim(action)) > 0),
  constraint admin_audit_events_entity_type_check
    check (length(btrim(entity_type)) > 0)
);

create index if not exists admin_audit_events_lead_idx
  on public.admin_audit_events (lead_id, created_at desc)
  where lead_id is not null;

create index if not exists admin_audit_events_actor_idx
  on public.admin_audit_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists admin_audit_events_action_idx
  on public.admin_audit_events (action, created_at desc);

alter table public.admin_audit_events enable row level security;
revoke all on table public.admin_audit_events from anon, authenticated;
grant select, insert on table public.admin_audit_events to service_role;

comment on table public.admin_users is
  'Admin/operator profiles for AZIMER console. Passwords are PBKDF2 hashes verified by admin-api.';
comment on table public.admin_audit_events is
  'Append-only audit trail for manager actions in the hidden admin console.';
comment on column public.leads.assigned_manager_id is
  'Manager responsible for this lead in the hidden admin console.';
comment on column public.leads.assigned_manager_name is
  'Display-name snapshot for the currently assigned manager.';
