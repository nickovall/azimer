-- =====================================================
-- АЗИМЕР — миграция: UTM-метки + источник трафика в leads
-- Применить через Dashboard SQL Editor → Run
-- =====================================================

alter table public.leads
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text,
  add column if not exists referrer     text,
  add column if not exists landing_page text;

create index if not exists leads_utm_source_idx on public.leads (utm_source);

comment on column public.leads.utm_source   is 'utm_source из URL заявки (yandex, google, 2gis, avito, vk, telegram, ...)';
comment on column public.leads.utm_medium   is 'utm_medium (cpc, organic, social, email, banner, ...)';
comment on column public.leads.utm_campaign is 'utm_campaign — название рекламной кампании';
comment on column public.leads.utm_content  is 'utm_content — идентификатор объявления/баннера';
comment on column public.leads.utm_term     is 'utm_term — ключевое слово (для контекстной рекламы)';
comment on column public.leads.referrer     is 'document.referrer — откуда клиент пришёл на сайт';
comment on column public.leads.landing_page is 'путь страницы где заполнил форму (/, /estimate, /services)';
