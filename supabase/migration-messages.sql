-- АЗИМЕР — Шаблоны сообщений + история отправок
-- Применять идемпотентно (CREATE IF NOT EXISTS, INSERT ON CONFLICT).
-- Доступ только через admin-api (service_role); public read запрещён.

-- ════════════════════════════════════════════════════════════════
-- Таблица: message_templates
-- ════════════════════════════════════════════════════════════════
create table if not exists public.message_templates (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null check (channel in ('sms', 'email')),
  slug         text not null,
  name         text not null,
  subject      text,                       -- для email
  body         text not null,              -- с плейсхолдерами {{client_name}}, etc.
  is_active    boolean not null default true,
  sort_order   int default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists message_templates_slug_uniq
  on public.message_templates (slug);
create index if not exists message_templates_active_idx
  on public.message_templates (channel, is_active, sort_order);

-- Триггер обновления updated_at
create or replace function public.trg_touch_message_template()
returns trigger language plpgsql as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;
drop trigger if exists trg_message_templates_touch on public.message_templates;
create trigger trg_message_templates_touch
  before update on public.message_templates
  for each row execute function public.trg_touch_message_template();

-- ════════════════════════════════════════════════════════════════
-- Таблица: lead_messages (история отправок)
-- ════════════════════════════════════════════════════════════════
create table if not exists public.lead_messages (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  channel         text not null check (channel in ('sms', 'email')),
  template_id     uuid references public.message_templates(id) on delete set null,
  template_slug   text,                    -- денормализация на случай удаления шаблона
  recipient       text not null,
  subject         text,
  body_rendered   text not null,
  status          text not null check (status in ('sent', 'failed', 'pending')) default 'pending',
  provider_resp   jsonb,
  error_message   text,
  sent_at         timestamptz not null default now(),
  sent_by         text                     -- пока null (будущее: логин менеджера)
);

create index if not exists lead_messages_lead_idx
  on public.lead_messages (lead_id, sent_at desc);
create index if not exists lead_messages_channel_idx
  on public.lead_messages (channel, sent_at desc);

-- ════════════════════════════════════════════════════════════════
-- RLS — доступ только через service_role (admin-api Edge Function)
-- ════════════════════════════════════════════════════════════════
alter table public.message_templates enable row level security;
alter table public.lead_messages     enable row level security;

-- (нет публичных policies — anon доступа нет; service_role обходит RLS)

-- ════════════════════════════════════════════════════════════════
-- Seed: 6 стартовых шаблонов
-- ════════════════════════════════════════════════════════════════

insert into public.message_templates (channel, slug, name, subject, body, sort_order)
values
  -- SMS ──────────────────────────────────────────
  ('sms', 'first_contact', '👋 Первое касание',
   null,
   'Здравствуйте, {{client_name}}! Это АЗИМЕР. Получили вашу заявку, перезвоним в течение часа. azimer.ru',
   10),

  ('sms', 'kp_ready', '📄 КП готово',
   null,
   '{{client_name}}, КП готово: {{kp_url}} Итог: {{kp_total}}. Звоните: {{manager_phone}}',
   20),

  ('sms', 'follow_up_3d', '🔁 Напоминание через 3 дня',
   null,
   '{{client_name}}, как вам наш расчёт? Готовы обсудить или нужна корректировка? АЗИМЕР {{manager_phone}}',
   30),

  -- Email ──────────────────────────────────────────
  ('email', 'first_contact_email', '👋 Первое касание (email)',
   'Спасибо за заявку! — АЗИМЕР',
   E'Здравствуйте, {{client_name}}!\n\nСпасибо за обращение в АЗИМЕР. Мы получили вашу заявку:\n• Объект: {{object_type}}\n• Регион: {{region}}\n• Предварительный расчёт: {{kp_range}}\n\nДетальное коммерческое предложение можно посмотреть здесь:\n{{kp_url}}\n\nМенеджер свяжется с вами в течение часа для уточнения деталей.\n\nС уважением,\n{{manager_name}}\nАЗИМЕР · Каркасные здания под ключ\n{{manager_phone}} · {{azimer_site}}',
   10),

  ('email', 'kp_ready_email', '📄 КП готово (email)',
   'Коммерческое предложение от АЗИМЕР',
   E'Здравствуйте, {{client_name}}!\n\nГотово коммерческое предложение по вашему объекту:\n\n📋 Объект: {{object_type}} в регионе «{{region}}»\n💰 Стоимость под ключ: {{kp_total}}\n📊 Диапазон с учётом колебаний цен: {{kp_range}}\n\nДетальное КП с разбивкой по позициям:\n{{kp_url}}\n\nДля сохранения как PDF нажмите Ctrl+P в браузере → Сохранить как PDF.\n\nКП действительно 14 дней. По вопросам:\n{{manager_name}} · {{manager_phone}}\n\nС уважением,\nкоманда АЗИМЕР\n{{azimer_site}}',
   20),

  ('email', 'follow_up_email', '🔁 Уточняем детали (email)',
   'Уточняем детали по вашему проекту — АЗИМЕР',
   E'Здравствуйте, {{client_name}}!\n\nКак вам наш расчёт по объекту? У нас есть несколько уточняющих вопросов, чтобы дать точное КП:\n\n1. Сроки начала строительства?\n2. Готов ли участок (фундаментные работы)?\n3. Особые требования по комплектации?\n\nГотовы обсудить детали удобным способом — звонок, WhatsApp, встреча.\n\nС уважением,\n{{manager_name}}\nАЗИМЕР · {{manager_phone}} · {{azimer_site}}',
   30)
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════
-- Комментарии
-- ════════════════════════════════════════════════════════════════
comment on table public.message_templates is
  'Шаблоны SMS/Email для отправки клиентам из админ-панели. Поддерживают плейсхолдеры {{var}}, рендеримые admin-api при отправке.';
comment on table public.lead_messages is
  'История отправок SMS и Email клиентам. Каждая запись = одна попытка отправки с результатом от провайдера.';
