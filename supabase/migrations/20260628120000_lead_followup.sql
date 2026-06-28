-- АЗИМЕР — напоминания (follow-up) по лидам
-- Менеджер ставит дату/время «перезвонить» прямо в карточке; дашборд показывает
-- что пора сегодня и что просрочено. Без этого договорённости тонут в заметках.

alter table public.leads
  add column if not exists follow_up_at   timestamptz,
  add column if not exists follow_up_note text;

-- Частичный индекс — дашборд выбирает только лиды с активным напоминанием.
create index if not exists leads_follow_up_at_idx
  on public.leads (follow_up_at)
  where follow_up_at is not null;
