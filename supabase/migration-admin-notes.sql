-- =====================================================
-- АЗИМЕР — миграция: заметки менеджера + время обновления статуса в leads
-- Применить через Dashboard SQL Editor → Run
-- или: node B:/dbtest/apply-admin-notes.mjs
-- =====================================================

alter table public.leads
  add column if not exists notes        text,
  add column if not exists status_updated_at timestamptz;

comment on column public.leads.notes              is 'Заметки менеджера по заявке (свободный текст). Заполняется из админки /admin/leads/view.';
comment on column public.leads.status_updated_at  is 'Когда последний раз менялся статус заявки. Автообновляется триггером.';

-- Триггер: при изменении статуса проставлять status_updated_at = now()
create or replace function public.touch_lead_status_ts()
returns trigger
language plpgsql as $$
begin
  if NEW.status is distinct from OLD.status then
    NEW.status_updated_at := now();
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_touch_lead_status_ts on public.leads;
create trigger trg_touch_lead_status_ts
  before update on public.leads
  for each row
  execute function public.touch_lead_status_ts();

-- Backfill: для существующих заявок поставим status_updated_at = created_at
update public.leads
   set status_updated_at = created_at
 where status_updated_at is null;
