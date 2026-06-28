# HANDOFF — АЗИМЕР

> Last updated: 2026-06-28 (Claude — мобильная адаптация админки [работа Codex, проверена+задеплоена] + правка контактов лида + напоминания follow-up. **Дерево чистое, всё в проде, `HEAD == origin/main == gitlab/main == 4c39c0b`.** Предыдущее: 2026-06-26 комплаенс 152-ФЗ)
> Status: **Фаза 1 = 100% в продакшне + UX-волна + комплаенс 152-ФЗ + мобильная админка**. Сайт + бот + админка + калькулятор + SMS/Email + PWA + бренд-email Resend — работают. **2026-06-28: админка адаптирована под телефон (нижний таб-бар, карточки каталога); добавлены правка контактов лида и напоминания (follow-up) — всё в проде.** Каталог 2026-06-15 остаётся production-каталогом.

---

## TL;DR

Сайт **azimer.ru** работает. Telegram-бот **@azimerbot** считает заявки тем же движком что сайт (bundle через esbuild). Скрытая админка `/console-x9p4m2` управляет заявками, ценами, шаблонами SMS/Email. Каталог цен живёт в Supabase БД (110 позиций с историей версий), движок собирается из БД через `prebuild` → `catalog.generated.ts`. Кнопка «🚀 Опубликовать на сайте» в админке триггерит GitLab pipeline. Каждый КП фиксирует `catalog_version` в `leads`. Engine v3 проверен 115/117 ассертами (2 known `tent_arched`). SMS работает (smsc.ru). Email — код готов, требует Resend domain verify.

**Мобильная админка + правка контактов + напоминания (2026-06-28, в проде):**
- **Мобильная адаптация админки** (запрос Азамата «адаптировать под телефон», работа Codex — проверена Claude и задеплоена, коммит `2db66e1`): нижний таб-бар `MobileAdminNav` на `md:hidden` (5 разделов + Выйти) вместо пропадавшего сайдбара; каталог цен на мобиле = карточки с inline-редактированием вместо широкой таблицы; Footer/CookieBanner/sticky-CTA скрыты на `/console-x9p4m2` (`components/HideOnAdminRoutes.tsx`). Публичный `<Header>` сайта **намеренно оставлен** над админкой (решение Ника). tsc+build чисто, Playwright-smoke 390×844 без горизонтального скролла.
- **Правка контактов лида** (коммит `4c39c0b`): action `update_lead_contact` + редактируемая секция «Контакт» в карточке (имя/телефон/email/компания/тип клиента/объекта/направление). Раньше после создания лида контакты править было негде. Имя/телефон нельзя стереть в пустое.
- **Напоминания (follow-up)** (коммит `4c39c0b`): колонки `follow_up_at`/`follow_up_note` в `leads` (миграция `supabase/migrations/20260628120000_lead_followup.sql`, применена через Mgmt API), action `set_lead_followup`. В карточке — блок «🔔 Напоминание» (быстрые кнопки завтра/+3д/+неделя, своя дата+время, заметка, снятие; подсветка просрочено/сегодня). Дашборд — блок «🔔 Напоминания на сегодня». Канбан — индикатор 🔔 (красный если просрочено). Время локальное с устройства (телефон Азамата в KRS). admin-api задеплоен.
- 🟡 **Не сделан живой клик-тест** (админка за паролем; tsc проверяет только Next, не Deno-функцию). Нику: открыть лид → поставить напоминание «Завтра 10:00» → проверить на дашборде; поправить email в «Контакт».
- **Отложено по запросу Ника:** связь с клиентом через Telegram/WhatsApp («есть сложности»), история взаимодействий (timeline вместо перезаписи заметок), мультипользователи/назначение лида (под команду «адептов» Азамата).

**Параллельно (Codex/Ник, 2026-06-27..28, в проде):** Cloudflare Turnstile-капча в формах + мастере расчёта + Edge Function `submit-lead` (приём заявок через service_role, боты не видят цены) — коммиты `922d42d`, `c4808f0`, `5e9d9a9`, `ddbef32`, `946a086`. Legal-пакет РКН обновлён (`124154b`).

**Wave UX «День 1-7» (2026-06-08 ... 2026-06-12)** в проде: Канбан вместо таблицы заявок, дашборд «Доброе утро», карточка лида с 8 папками документов и CTA сверху, встроенный редактор КП, кнопка «Закрыть сделку», PWA + токен на 30 дней, брендированный HTML-email через Resend с `info@azimer.ru`, отправка email/SMS на произвольный адрес из админки. Cloudflare Worker proxy `/api/admin` готовился под блокировки Supabase — **отменён 2026-06-15** (админка работает напрямую без проблем).

**Каталог обновлён 2026-06-15** под реальные прайсы: сэндвич/профлист/доборка/крепёж + ворота секционные ДорХан (Стройлайф). 45 правок + 3 новые позиции. Дилерские цены, клиентская наценка +20% уже зашита в `FINANCE.client_markup_pct`. Apply: `B:/dbtest/apply-supplier-prices-2026-06-15.mjs`. Старые лиды защищены через `catalog_version` snapshot — исторические КП не пересчитываются.

**Операционка закрыта частично (2026-06-23):**
- ✅ `ALLOWED_CHAT_IDS=1504123319` (Азамат) залит в Supabase Secret — Telegram-уведомления заработают как он зайдёт в TG
- ✅ Шаблоны SMS/Email обезличены: убраны `{{manager_name}}`/`{{manager_phone}}`, теперь просто «АЗИМЕР» + azimer.ru. Apply: `B:/dbtest/apply-templates-cleanup-2026-06-23.mjs`. Блокер MANAGER_* снят (решено писать обезличенно).
- 🔴 Осталось от Азамата: SMSC баланс 300₽, Resend domain verify, поставщик окон ПВХ.
- ✅ Налоговый режим определён: **ОСН** (НДС 22% с вычетом + налог на прибыль 25%, не УСН). Используется в модели маржи 2026.

**Систематический разбор архива (2026-06-23, Фаза 1 батч 1):**
- План: `~/.claude/plans/steady-seeking-wadler.md`. Цель — полная декомпозиция работ каркасного строительства (не витрина).
- Инфраструктура: `build_tier_lists.py` (tier1=146 Смета/КС-3/Акт, tier2=232 Счёт/УПД, tier3=294 КП/Договор, дедуп sha256+имя), `extract_fulltext.py` (локальное извлечение PyMuPDF/openpyxl/pandas/python-docx, 0 токенов), `parse_positions.py`, `aggregate_positions.py`.
- **Батч 1 готов:** 45 XLSX/DOCX смет → 951 позиция → **220 уникальных РАБОТ** + 149 материалов (было 16 работ в каталоге → ×14). `analysis/ДЕКОМПОЗИЦИЯ_РАБОТ.md`, `positions_aggregated.csv`.
- Структура отличная (монтаж колонн/ферм/прогонов, сварка, огнезащита МК, бурение+ж/б сваи, земляные, кровля, фасад). Найдена реальная смета гаража сборно-разборного (ГРАНД-Смета, 16.6М).
- **Цены:** чистые из простых актов (Ачинск-фасад 300/400/350 ₽/м²) + мехчасы из актов (кран 1200-2600 ₽/маш.час) + счетов поставщиков. РИМ-сметы/ГРАНД-КС-2 дают цены с коэффициентами — для цен НЕ использовать, опираться на простые акты+счета+рынок.
- **Батч 2-3 готовы (автономно):** Tier1 PDF (74 текстовых через `extract_tables.py` find_tables) + Tier2 счета (79 PDF → 305 позиций). Итого **612 уникальных позиций: 454 работы + 149 материалов + 9 мехчасов**. Сводный Excel `analysis/ИЗВЛЕЧЕНО_ИЗ_ДОКУМЕНТОВ.xlsx` (листы РАБОТЫ/МАТЕРИАЛЫ/МЕХЧАСЫ по этапам стройки).
- **Чистые цены найдены:** контрактные расценки работ АЗИМЕР из простых актов (К-договоры Норильск: штукатурка 1200, грунтование 1000, стяжка 446, утепление полов Пеноплекс 150-287 ₽/м²; фасад Ачинск 300/400/350; прокат виброрейки 2160/трансформатора прогрева бетона 1800 ₽/сут). Закупка материалов из счетов (металл МеталлИнвест, бетон, песок, щебень, окна ПВХ 2622 ₽/м², кабель, фанера).
- **Осталось:** 25 сканов Tier1 + ~80 сканов Tier2 + Tier3 КП (294) → OCR (Фаза 4) → рыночное сравнение по каждой позиции (Фаза 5) → финальный мастер-прайс. Трекинг #21-23.
- **Реквизиты подтверждены:** ООО «АЗИМЕР», ИНН 2466294494, Красноярск, ул. Караульная 88, оф. 9-21. Объекты в архиве: Норильск (Рудник Комсомольский, столовая), Ачинск (фасад), Белоярский (гараж сборно-разборный 16.6М), теплосети.

**Дип-ресерч ценовой политики (2026-06-23, в `tools/azamat-mailbox/analysis/`):**
- `CATALOG_DEEP_RESEARCH_2026.md` — налоговая реформа 2026 (УСН+НДС, прибыль 25%) + конкурентная матрица Красноярска (ФСМ-24, ТСК38, ВелесТент, ЛСТК-Кр) + позиционирование «верх среднего, выше ФСМ-24»
- `ПРАЙС_УСЛУГИ_АЗИМЕР_2026.md` — **главный черновик**: под ключ ₽/м² (7 типов), монтажные работы, фундамент, ворота/двери, оборудование, региональные коэффициенты, модель маржи (18-22% чистыми после налогов)
- `ФАСАД_РАБОТЫ_АЗИМЕР_2026.md` — фасадный прайс из РЕАЛЬНЫХ актов Азамата (вентфасад: кронштейны 300, утепление 400, профиль 350 ₽/м², откосы 2400 ₽/шт — субподряд у ООО СЦМР). Фасад выводить отдельной страницей.
- `CATALOG_REPORT_v2.md` — диф цен из смет vs рынок (бетон, арматура, двери, электроды)
- **Все 3 главных дока ждут ревью Николая** перед сборкой финального Excel и публикацией в catalog_items.

Новый пилотный канал продаж вынесен отдельно в `sales-pipeline/` и поднят на VPS Николая: Supabase-схема закупок/статусов/документов/комиссий применена в AZIMER project `objgpsjyftdrhafapwvw`, n8n доступен на `https://nickelautomata.duckdns.org`, workflow `AZIMER Tender Pipeline - Pilot` импортирован и активен. Workflow папок сделок импортирован, но оставлен manual. Первая ручная волна на 08.06.2026 собрана в XLSX: 51 raw lead, 15 shortlist, 7 first-touch; новый сильный лид `AZ-T-051` — B2B-Center №4474813, Мангазея Майнинг, ангар 44x18.

**Почтовый архив 2026-06-22:** Mail.ru и Gmail выгружены локально без изменения писем. Получено 6 081 уникальных файлов/писем (2,12 ГБ после дедупликации), включая 2 921 уникальное вложение, 2 975 релевантных тел писем и 185 файлов из ZIP. Успешно извлечено 2 209 ценовых документов; 9 файлов без текстового слоя/содержимого требуют OCR или ручного просмотра. Проверочный XLSX содержит 3 708 классифицированных кандидатов цен и 4 506 неклассифицированных. Это не production-прайс: каждая строка имеет статус `needs_review`.

**Юридический комплаенс 152-ФЗ (2026-06-26):** аудит сайта на соответствие закону о персональных данных + правки в коде.
- **Стратегия (решения Ника):** локализацию БД в РФ **НЕ делаем** — принятый риск; Supabase остаётся (EU-регион → трансграничка по лёгкому режиму ст.12, Конвенция 108). Прокси перед Supabase не ставим (anon-ключ публичен по замыслу, защищает RLS). В юр.текстах бренд Supabase/хостинг **не называем** (форма РКН их не требует). Память: `pdn-compliance-strategy.md`.
- **Сделано в коде (НЕ задеплоено, проверено `tsc` + HTTP-рендером, скриншотов нет — dev-сервер без env):**
  - `components/ui/ConsentCheckbox.tsx` — чекбокс согласия на обработку ПДн (снят по умолчанию, гейтит submit), встроен в 4 формы: ContactForm, PartnerForm, ProjectForm, RaschetWizard (там согласия не было вообще).
  - `app/privacy/page.tsx` — политика переписана под ст.18.1 (реквизиты, перечень данных вкл. cookie/Метрику/вебвизор/файлы/IP/UTM, цели/основания, трансграничка в ЕС без бренда, срок 3 года, отзыв согласия, дата редакции).
  - `components/CookieBanner.tsx` — баннер о cookie/аналитике (российский формат), подключён в `app/layout.tsx`.
  - `components/Footer.tsx` — добавлена ссылка на /privacy (свободный доступ).
- **Бумаги для Азамата (черновики, не код):** `azimer-site/docs/legal/rkn-notification.md` (текст уведомления РКН, без раскрытия инструмента; 2 поля ⚠️ — страна ЕС и местонахождение БД, решает Азамат), `rkn-prikaz-otvetstvennyy.md` (приказ о назначении ответственного).
- **Осталось от Азамата:** подать уведомление РКН через Госуслуги (обработка + трансграничка), подписать приказ, уточнить конкретную страну EU-региона Supabase.
- **Вебвизор выключен** (26.06.2026, решение Ника): `webvisor:false` в Analytics.tsx + убран из политики — минимизация данных, оставлен набор форма+UTM+базовая Метрика. ⚠️ Нику ещё нужно выключить Вебвизор в кабинете Метрики (код не отключает его на стороне Яндекса).

---

## Architecture

```
Клиент → azimer.ru (Next.js 16 static export, GitLab Pages → Cloudflare DNS)
         ├─ /                    — главная (Hero/Stats/About/Services/Audiences/
         │                          Advantages/Process/Gallery/Objects/Trust/CTA)
         │                          (Testimonials убран по запросу Азамата 2026-06-04)
         ├─ /services            — услуги
         ├─ /projects            — объекты (реальные фото с object-position)
         ├─ /about               — о компании
         ├─ /contacts            — контакты + ContactForm
         ├─ /estimate            — мастер расчёта (использует lib/calculator v3)
         ├─ /estimate-project    — расчёт по готовому проекту
         ├─ /partners            — партнёрство
         ├─ /kp#data=...         — детальный КП из URL hash (full engine, print→PDF)
         └─ /console-x9p4m2      — 🔒 СКРЫТАЯ АДМИНКА (нужен ?k=Az9pK2m4Tn7Wq3 + пароль)
              ├─ /             — дашборд (воронка, источники, средний чек)
              ├─ /leads        — список заявок (фильтры + поиск)
              ├─ /leads/view   — карточка заявки (статусы, заметки, расчёт,
              │                   ✉️ Отправить SMS/Email из шаблонов, история отправок)
              ├─ /catalog      — каталог цен + кнопка «🚀 Опубликовать на сайте»
              └─ /templates    — 🆕 управление шаблонами SMS/Email с плейсхолдерами

Supabase Postgres (project: objgpsjyftdrhafapwvw)
  ├─ leads                   — заявки + UTM + estimate jsonb + status + notes
  │                            + catalog_version (snapshot)
  ├─ kp_sessions             — состояние wizard-сессий Telegram-бота
  ├─ catalog_items           — 107 позиций цен (история через valid_from/valid_to)
  ├─ catalog_categories      — справочник (sandwich/proflist/.../works/finance)
  ├─ message_templates       — 🆕 шаблоны SMS/Email (6 seed, активируемые)
  ├─ lead_messages           — 🆕 история отправок (sms/email, status, response)
  └─ pg_net trigger v5 на INSERT в leads:
       ├─ Telegram карточка Азамату (HTML + inline кнопки статусов)
       └─ SMS клиенту через smsc.ru API (ждёт баланса smsc.ru)

Edge Functions (Supabase):
  ├─ telegram-bot             — webhook бота (1200+ строк + import calculator.bundle.js
  │                              из lib/calculator → один источник правды с сайтом)
  └─ admin-api                — все admin операции (15 actions):
       ├─ verify_password, list_leads, get_lead, update_lead_status,
       │    update_lead_notes, dashboard_stats, list_templates,
       │    save_template, delete_template, send_sms, send_email,
       │    list_lead_messages, get_message_context, trigger_rebuild,
       │    update_price, bulk_update, get_history

Telegram Bot (@azimerbot)
  └─ Wizard /kpnew — 15 шагов:
       1. Имя клиента
       2. Телефон
       3. Регион (8 кнопок: Красноярск → Норильск)
       4. Тип объекта (включая 🏕 Арочный тент эконом)
       5-7. Размеры (L×W×H)
       8. Каркас (ЛСТК / Металл / Модульный)
       9. Стены (none/proflist/sandwich_minvata/sandwich_pir)
      10. Толщина панели (50/80/100/120/150/200 мм)
      11. Кровля
      12. Фундамент (none/pile_screw/strip/slab)
      13-14. Ворота / Окна / Двери
      15. Мостовой кран (0/1/3.2/5/10/20т → ENGINEER_REQUIRED при ≥10т)
      16. Примечание
      17. Подтверждение → ссылка на /kp#data=base64
        ↓
       Создаёт lead + catalog_version + расчёт ПОЛНЫМ engine v3 (тот же что на сайте)

Deployment / CI:
  ├─ Site:    GitLab CI (pages job, node:20-alpine)
  │            ├─ npm ci
  │            ├─ npm run build           (prebuild → gen:catalog → next build)
  │            ├─ npm run build:bot-bundle (esbuild lib/calculator → bot bundle)
  │            ├─ npx supabase functions deploy telegram-bot (auto)
  │            └─ rm -rf public; mv out public  → GitLab Pages
  ├─ admin-api: ручной деплой через `supabase functions deploy admin-api`
  │             (когда меняем UI админки — push коммита деплоит сайт; функцию
  │              отдельно через CLI, у Николая локально работает)
  ├─ Bot:     auto-deploy через CI (один push = сайт + бот синхронно)
  └─ DB:      скрипты B:\dbtest\*.mjs через pg-client с прямым PG-connection
```

---

## Current state

### ✅ Готово (всё в проде)

**Сайт + SEO:**
- azimer.ru со всеми страницами, реальные фото объектов (с object-position per-image)
- Yandex.Metrika 109414059 + UTM-захват → sessionStorage → Supabase leads
- Yandex.Webmaster + Google Search Console подтверждены, sitemap отправлен
- Favicon из рулетки лого + OG-картинка фирменная
- Sitemap.xml + robots.txt
- Footer: логотип, навигация, контакты, копирайт
- **Testimonials убран** (2026-06-04 по запросу Азамата) — компонент и data остались в репо для возврата

**Калькулятор v3:**
- Инженерный движок, 12 регионов, 7 типов объектов
- Регион из СП 20.13330 табл. К.1 (Красноярск Sg=1.35, Норильск Sg=2.40 кПа)
- Кран нелинейно (5т=+35%, 10т=+100%, 20т=+165%)
- Cold/warm режим (×0.60 metal для холодного)
- ENGINEER_REQUIRED для крана >10т, мерзлоты, сейсмики 8+, экстрим снег
- **Сваи по нагрузке** (СП 24.13330), не по геометрии — фикс 2026-06-03
- 117 assertion-тестов прошли, 100% соответствие СНиП/ГЭСН
- Скрытые коэффициенты документированы в `llm-wiki/pricing/engine-accuracy-audit-2026-06-03.md`

**Каталог цен:**
- В Supabase БД (107 позиций), история версий, RPC update_catalog_price
- Build-time snapshot: `scripts/build-catalog.mts` → `catalog.generated.ts`
- Эталон fallback: `lib/calculator/catalog.fallback.ts` (закоммичен)
- Все labels на русском
- `leads.catalog_version` snapshot в каждом КП

**Telegram-бот:**
- Использует тот же движок что сайт (через esbuild bundle, scripts/build-bot-bundle.mts)
- 15-шаговый Wizard /kpnew с географией, толщиной, краном
- Команды /leads /leadsnew /stats /find /help и др.
- Расчёт сходится рубль-в-рубль с /kp
- Auto-deploy через CI после каждого push

**Админ-панель `/console-x9p4m2`:**
- Двойная защита: gate-key в URL + пароль
- Дашборд (воронка, источники, средний чек, последние 10 заявок)
- Список заявок (фильтры по статусу/источнику, поиск, пагинация)
- Карточка заявки:
  - Смена статуса с заметками менеджера
  - Параметры объекта (русские лейблы, не raw enum)
  - Расчёт калькулятора с разбивкой по строкам и ценами
  - 🆕 Секция «Отправить сообщение» (SMS / Email, шаблоны, превью с подстановкой плейсхолдеров, редактирование)
  - 🆕 История отправок (дата, канал, шаблон, статус)
  - Версия каталога цен
  - Прикреплённые файлы (signed URLs)
- Каталог цен (107 позиций, редактор)
- Кнопка «🚀 Опубликовать на сайте» (триггерит GitLab pipeline через trigger_rebuild)
- 🆕 Страница `/templates` — управление шаблонами SMS/Email с панелью плейсхолдеров

**Шаблоны сообщений:**
- 6 готовых: 3 SMS (first_contact, kp_ready, follow_up_3d) + 3 Email
- Поддержка плейсхолдеров: `{{client_name}}`, `{{kp_url}}`, `{{kp_total}}`, `{{kp_range}}`, `{{object_type}}`, `{{region}}`, `{{manager_phone}}`, `{{manager_name}}`, `{{date}}`, `{{azimer_site}}`, и др.
- SMS работает через smsc.ru (нужно пополнить баланс)
- Email через Resend.com (нужна регистрация + domain verify)

**Триггер v5 (auto-уведомления):**
- pg_net на INSERT в leads → Telegram + SMS клиенту

**CI/CD:**
- GitLab Pages auto-deploy с push (90 сек: сайт + бот)
- Кнопка «Опубликовать» в админке для ручного триггера
- `SUPABASE_ACCESS_TOKEN` в GitLab CI vars (masked + protected)

**Engine accuracy audit (2026-06-03):**
- 117 assertion-тестов по 10 слоям (geometry/frame/foundation/walls/roof/openings/finance/multipliers/regions/classifier)
- **100% pass** после фикса foundation.ts (сваи по нагрузке вместо геометрии)
- Главные находки и LIMITATIONs документированы

**SEO + дизайн фиксы (2026-06-04):**
- Counter в Stats: SSR теперь рендерит реальные числа (раньше «0» в HTML — SEO-вред)
- About страница: убран дубль H2 (заменён на «Кто мы и как работаем»)
- Header: убрано дёрганье шапки на iOS при scroll (hysteresis + GPU layer)
- Карточка заявки: цены в «Строках расчёта» отображаются (`label/value` + `name/total` + `cost`)
- Параметры объекта в карточке: русские лейблы вместо raw enum
- Object-position для фото per-image (`top`, `center`, `bottom`)

**PDF-отчёт Азамату** (`AZIMER_Отчёт_Фаза_1_Азамату.pdf`, 12 страниц, 434 KB):
- Обложка с логотипом и KPI
- Резюме + ключевые показатели
- Таймлайн 10 этапов работ (от исследования до аудита)
- Обзор 6 компонентов (сайт/калькулятор/бот/админка/БД/CI)
- Точность калькулятора (100% по СНиП + сходимость с рынком)
- База данных и серверная инфраструктура
- Преимущества над конкурентами + SEO
- Что осталось от Азамата
- Бизнес-эффект и сроки
- План развития (Фазы 2-5)

### 🟡 Пилотный sales-pipeline закупок (VPS/n8n поднят, ждёт первого UI smoke-test)

- Папка: `sales-pipeline/`
- Supabase SQL применён в AZIMER project `objgpsjyftdrhafapwvw`: `sales-pipeline/supabase/001_sales_pipeline_schema.sql`
  - таблицы `sales_sources`, `sales_parser_runs`, `sales_tenders`, `sales_lead_scores`, `sales_pipeline`, `sales_lead_events`, `sales_documents`, `sales_commissions`
  - RLS включён на всех таблицах
  - n8n использует `AZIMER_SUPABASE_SERVICE_ROLE_KEY` только server-side
- Папки документов применены: `sales-pipeline/supabase/002_document_folders.sql`
  - таблица `sales_project_folders`
  - storage bucket `sales-documents`
  - поля `project_folder_id`, `folder_key`, `storage_bucket`, `storage_path` в `sales_documents`
  - структура папки сделки: `01_TZ`, `02_KP_i_smety`, `03_Dogovory`, `04_Scheta`, `05_Akty`, `06_Oplaty`, `07_Perepiska`, `08_Foto_i_chertezhi`
- n8n workflow: `sales-pipeline/n8n/azimer_tender_pipeline_starter.workflow.json`
  - ID: `AZIMERTenderPipelinePilot`
  - импортирован на VPS, `active=true`, опубликован
  - schedule: `0 8 * * 1-5`, timezone `Asia/Krasnoyarsk`
  - daily/manual trigger
  - источники: EnergyBase modular pages + B2B-Center angars
  - extract + score JS Code node
  - upsert в Supabase через REST
  - Telegram alert только по A/B лидам
- n8n workflow папок: `sales-pipeline/n8n/azimer_project_folder_starter.workflow.json`
  - ID: `AZIMERProjectFolderPilot`
  - импортирован на VPS, `active=false`; запускать вручную по первой реальной сделке
  - принимает `lead_code`, `provider`, `root_folder_url`
  - пишет ссылку на папку сделки в `sales_project_folders`
  - шлёт Telegram-уведомление
- VPS live:
  - SSH alias: `vps`
  - n8n compose dir: `/home/ubuntu/n8n-compose`
  - n8n URL: `https://nickelautomata.duckdns.org` (HEAD check 2026-06-08: HTTP 200)
  - containers running: `n8n`, `postgres`, `traefik`
  - AZIMER secrets mounted from `/home/ubuntu/secret-vault/common/azimer_*`
- Запуск n8n на чистом VPS: `sales-pipeline/docker-compose.n8n.example.yml`
- Переменные без секретов: `sales-pipeline/.env.example` (`AZIMER_SUPABASE_URL`, `AZIMER_SUPABASE_SERVICE_ROLE_KEY`, `AZIMER_TELEGRAM_BOT_TOKEN`, `AZIMER_TELEGRAM_CHAT_ID`)
- Документация: `sales-pipeline/README.md`, `sales-pipeline/docs/sources-and-parser.md`, `sales-pipeline/docs/first-wave-2026-06-08.md`
- XLSX-пакет первой волны: `output/azimer_tender_leads_2026-06-08.xlsx`
  - `Pipeline 51`: все найденные закупки
  - `Shortlist 15`: приоритетные A/B
  - `First touch 7`: первые касания с черновиками сообщений
  - `CRM Pilot`: ручной учёт передачи Азамату, КП, оплаты, комиссии
- Проверенный новый A-лид: `AZ-T-051` — B2B-Center №4474813, ООО «МАНГАЗЕЯ МАЙНИНГ», проектирование/поставка/монтаж ангара 44x18 м, дедлайн 10.06.2026 12:00 МСК.
- Проверено 2026-06-08:
  - n8n DB: `AZIMERTenderPipelinePilot|active=t`, `AZIMERProjectFolderPilot|active=f`
  - REST check из VPS к AZIMER Supabase `sales_sources` вернул HTTP 200
  - CLI `n8n execute --id=AZIMERTenderPipelinePilot` не прогнан: live n8n уже держит Task Broker port `5679`; первый parser smoke-test делать через UI Manual Trigger или дождаться schedule

### 🟡 Архив почты и подготовка прайса (2026-06-22)

- Инструмент: `tools/azamat-mailbox/`
- Подключения:
  - Mail.ru `azimer_sk` — IMAP работает, архив выгружен
  - Gmail `azamat_personal` — IMAP работает, архив выгружен
  - Облако Mail.ru — WebDAV `https://webdav.cloud.mail.ru` отвечает HTTP 403 с текущим app-password; нужен пароль приложения с доступом к Облаку или активация WebDAV
- Результат:
  - 6 081 уникальный объект, 941 дубль
  - 2 526 ценовых документов
  - 2 209 документов/писем успешно преобразованы в текст/таблицы
  - 9 проблемных файлов: 8 PDF-сканов без текстового слоя + 1 пустой DOCX-шаблон
  - 3 708 классифицированных кандидатов для калькулятора
  - 4 506 неклассифицированных ценовых строк для ручной сортировки
- Итоговый файл: `tools/azamat-mailbox/output/mailbox-price-catalog-2026-06-22/azimer-mailbox-price-catalog.xlsx`
- Листы XLSX:
  - `Сводка`
  - `Кандидаты цен`
  - `Неклассифицированные`
  - `Документы`
  - `Проблемы извлечения`
  - `Инструкция`
- Важно: кандидаты вычислены только когда найдена явная цена `руб/ед.` или проверяется арифметика `количество × цена ≈ итог`. Тем не менее перед публикацией нужно вручную подтвердить единицу, НДС, доставку, регион и дату.
- Следующие конкретные шаги:
  1. Отфильтровать `Кандидаты цен` по нужной категории и поставить `approved/rejected`.
  2. Разобрать лист `Неклассифицированные`, присвоить категории полезным строительным позициям.
  3. OCR восьми PDF-сканов из листа `Проблемы извлечения`.
  4. Получить доступ WebDAV к Облаку Mail.ru и повторить тот же pipeline для файлов Облака.
  5. Только после ручной проверки подготовить импорт `approved`-строк в `catalog_items`.
- Credentials/env names, без значений:
  - `AZIMER_SK_EMAIL`, `AZIMER_SK_PASSWORD`
  - `AZAMAT_PERSONAL_EMAIL`, `AZAMAT_PERSONAL_PASSWORD`
- Ключевые файлы:
  - `tools/azamat-mailbox/fetch_archive.py`
  - `tools/azamat-mailbox/fetch_relevant_bodies.py`
  - `tools/azamat-mailbox/build_inventory.py`
  - `tools/azamat-mailbox/extract_documents.py`
  - `tools/azamat-mailbox/extract_price_candidates.py`
  - `tools/azamat-mailbox/build_price_workbook.mjs`

### 🔴 Заблокировано — ждём от Азамата (статус на 2026-06-23)

1. **Пополнение smsc.ru на 200-300₽** — без этого SMS не пойдут (всё ещё ждём)
2. ✅ **chat_id Азамата = 1504123319** — залит в Supabase Secret `ALLOWED_CHAT_IDS` 2026-06-23. Telegram-уведомления заработают как он зайдёт в TG (нужен VPN либо комп).
3. **Прайсы поставщиков:**
   - ✅ СЭНДВИЧ — получен и залит 2026-06-15 (поставщик НЕ опознан — пришёл вне 2 выкаченных почт, спросили Азамата)
   - ✅ ВОРОТА секционные ДорХан (Стройлайф, torgashin72@mail.ru) — получен и залит 2026-06-15
   - 🟡 **ДВЕРИ** — найдены в архиве: ГК Краспро (rb@gk-kraspro.ru, противопожарные+ворота), Артэкс Омск. Цены в сканах — нужен OCR
   - ❌ **ОКНА ПВХ** — в архиве ВООБЩЕ нет переписки. Поставщика нет. Нужен новый.
   - ✅ **ФАСАД** — найдены РЕАЛЬНЫЕ акты Азамата (вентфасад, субподряд у ООО СЦМР). Прайс собран → `ФАСАД_РАБОТЫ_АЗИМЕР_2026.md`
   - 🟡 **МЕТАЛЛОПРОКАТ** — поставщики: Регсталь, ДОМ Металла, ISteels, Трубопродукт. Цены частью в сканах
4. **Подтверждение домена `azimer.ru` в Resend** — без этого брендированный Email не работает
5. ✅ **MANAGER_*** — решено НЕ персонализировать, шаблоны обезличены на «АЗИМЕР». Блокер снят.
6. ✅ **Налоговый режим** — определён: **ОСН** (НДС 22% с вычетом + налог на прибыль 25%, не УСН). Заложен в модель маржи 2026. Блокер снят.
7. **Реальные фото объектов** (опционально)

**Опознаны контрагенты из архива (2026-06-23):**
- balansgrad@mail.ru = бухгалтер (С-Материалс), sergo242 = воровайка/манипулятор, smk1601996 = ИП Почекутов, ГК Краспро = двери/ворота, КрасАгроСтрой (kas4695/kas770701) = сэндвич/профлист/фасад, EVOTECH + NF Урал = подсистемы вентфасада, АбсолютСервис = огнезащита древесины (не наш профиль)
- **2 сообщения Азамату отправлены, ждём ответы:** (а) кто заполнял СЭНДВИЧ-прайс + про вторую почту azamatmavliyanov@gmail.com; (б) опознать топ-контрагентов + поставщик окон

**Уточнения, отправлены Азамату 2026-06-15:**
- Делать ли в боте выбор «с автоматикой / без автоматики (РЦП)»? (Николай: «делаем» → таск #7b)
- PIR 50/80 в боте оставлять? (Николай: показывать все толщины)
- Указывать ли поставщиков в КП? (Николай: не указывать)

---

## Calculator v3 — подробно

См. полный inventory в `llm-wiki/pricing/engine-accuracy-audit-2026-06-03.md` (документация всех скрытых коэффициентов engine).

**Слои (lib/calculator/):**
- `types.ts` — TypeScript интерфейсы
- `regions.ts` — 12 регионов с snow/wind/seismic/permafrost/winterSurchargePct
- `catalog.ts` — thin re-export из `catalog.generated.ts` (gitignored)
- `catalog.fallback.ts` — эталон цен (закоммичен)
- `catalog.generated.ts` — генерится `scripts/build-catalog.mts` (prebuild)
- `consumption.ts` — нормативы расхода СНиП/ГЭСНм (FRAME_NORMS, FOUNDATION_NORMS, SANDWICH_NORMS)
- `geometry.ts` — площади/периметры/уклон
- `classifier.ts` — TYPICAL / EXTENDED / ENGINEER_REQUIRED
- `engine.ts` — главный `calculate(input)` + computeTotals (НР/СП/маржа/наценка по МДС)
- `modules/walls.ts`, `roof.ts`, `frame.ts`, `foundation.ts`, `openings.ts`

**Финансовая надстройка** (FINANCE из catalog.fallback):
- `overhead_pct_of_FOT: 1.06` (МДС 81-33)
- `profit_pct_of_FOT: 0.65` (МДС 81-25)
- `company_margin_pct: 0.15`
- `client_markup_pct: 0.20` (cold override = 0.15)
- `fot_share_of_works: 0.60`

**Калибровочные кейсы** (после fix foundation):
- Белый Куб 7.44×4.6×3: наш 1.38М vs реальное КП 1.7М (−18.6%, но **разные конструкции** — engine считает как промышленный, а Куб — жилой ЛСТК-модуль)
- Тёплый склад 6×18×4: 40.9К/м² (рынок ФСМ-24 ~22-24К, средний 35-50К — в норме)
- Холодный ангар 12×24×6 профлист: 15К/м² (рынок ФСМ-24 22К под ключ, АМС-МК 7К только конструкция — в норме)
- Эконом тент 12×24: 4.6К/м² (рынок 3.9-4.7К ✓)

---

## Key decisions

1. **Для сайта не n8n** — Supabase Edge Functions + pg_net. Меньше точек отказа, бесплатно, не зависим. **Для нового канала закупок n8n допустим**, потому что нужен внешний парсинг, расписание, retry и интеграции.
2. **GitLab Pages вместо Cloudflare** — CF душится РКН с лета 2025.
3. **Single-file Edge Function** для бота — Supabase Dashboard "Via Editor" глючит с multi-file. Но через CLI multi-file работает — у нас бот теперь импортит `_shared/calculator.bundle.js`.
4. **Распределение маржи пропорционально по группам** — клиент НЕ видит "наценка X%". Стандарт КП под ключ.
5. **Engine v2 с двойным режимом cold/warm** — определяется по облицовке.
6. **Регион в калькуляторе обязателен** — Норильск/Эвенкия требуют другого расчёта.
7. **Логистика убрана** — Азамат считает отдельно, нет своего производства.
8. **Каталог в БД** — обновление через админку + кнопка «Опубликовать», без программиста.
9. **Бот = тот же движок что сайт** через esbuild bundle. Один источник правды.
10. **Снимок версии каталога в leads** — историческая прослеживаемость КП.
11. **Двойная защита админки** (gate-key URL + пароль) — CF Access недоступен в РФ.
12. **`trailingSlash: true`** в next.config — без него прямые URL подстраниц на GitLab Pages дают 404.
13. **Шаблоны SMS/Email в БД** — Азамат сам может редактировать через `/templates`.
14. **Counter SSR-aware** — initial = `to`, не 0 (SEO).
15. **Header GPU-layer** — `translate3d(0,0,0)` + hysteresis 12-24px против дёрганья на iOS.
16. **Сваи по нагрузке** (СП 24) не по геометрии — buildingMassT × 1.15 / pileCap.
17. **Sales-pipeline живёт у Николая** — Supabase/n8n/Telegram под контролем Николая, чтобы лиды проходили через Lead ID и можно было считать комиссию до интеграции с 1C.
18. **Перед production-автоматизацией — ручная первая волна**. Выбрали 7 first-touch лидов, потому что открытые страницы ЭТП дают разное качество данных; сначала нужно проверить конверсию в ТЗ/КП и только потом усложнять парсер.
19. **Для AZIMER sales-pipeline в n8n используются отдельные `AZIMER_*` env** — на VPS уже есть shared `SUPABASE_*` для другого проекта; отдельные имена исключают случайную запись лидов в не тот Supabase.

---

## Open questions

- **Расширенный wizard** для антресолей и Г-образных планов — отложено
- **PDF реальный** через библиотеку (pdfmake) вместо print→PDF — нужен?
- **AI-чат** на главной для квалификации (задача #12) — отложено
- **Имя AZIMER в SMS** — Азамат заплатит 2-2.5К/мес за МТС/Мегафон?
- **VK-бот** — обсуждали, ответ «можно сделать за 1 рабочий день» когда будет VK community
- **GEO/AI SEO** — обсуждали (llms.txt, Schema.org, FAQ), отложено как Фаза 2
- **Первый smoke-test n8n workflow** — запустить через UI Manual Trigger или дождаться расписания; CLI execute конфликтует с live Task Broker port `5679`
- **Доступы к ЭТП** — EnergyBase/B2B-Center скрывают часть контактов и документов без аккаунта; для production нужны доступы или ручная верификация
- **1C integration** — отложено до первых КП/договоров; пилот пока ручной по Lead ID

---

## Next concrete steps

🔴 **От Азамата:**
1. ✅ chat_id получен (`1504123319`) и залит в `ALLOWED_CHAT_IDS` — заработает как зайдёт в TG
2. Пополнить SMSC баланс 200-300₽
3. ✅ MANAGER_* — снято (шаблоны обезличены на «АЗИМЕР»)
4. Прислать недостающие прайсы: окна ПВХ (нет в архиве), OCR сканов дверей/металла

🟡 **Важно для качества:**
5. Реальная смета закрытого промышленного объекта — для honest engine калибровки (Белый Куб = жилой модуль, не подходит)
6. Подтверждение домена `azimer.ru` в Resend → Email заработает
7. Реальные фото для коммерческих/модульных/производственных (если хочет лучше)

🟢 **Опционально (Фаза 2 кандидаты):**
8. UX обоснование цены на /estimate («Что включено / Что не включено / Сравнение с конкурентами»)
9. VK-бот (если есть VK community)
10. GEO: llms.txt + Schema.org + FAQ + контент-маркетинг под ИИ-поисковики
11. Регистрация в 2ГИС, Яндекс.Карты, Google Maps
12. Follow-up SMS через 3 дня после КП
13. AI-чат на главной для квалификации
14. Расширенный wizard (антресоль, Г-план)

🟣 **Новый sales-pipeline пилот:**
15. Отправить Азамату/обработать первую волну из `sales-pipeline/docs/first-wave-2026-06-08.md`
16. В первую очередь закрыть срочные лиды `AZ-T-051`, `AZ-T-002`, `AZ-T-008` (дедлайны 10-11 июня 2026)
17. По каждому first-touch занести факт ответа/ТЗ/КП в `output/azimer_tender_leads_2026-06-08.xlsx` → `CRM Pilot`
18. После 2-3 ответов решить, какие источники реально дают ТЗ/КП и какие автоматизировать первыми
19. Открыть n8n UI `https://nickelautomata.duckdns.org` и запустить Manual Trigger для `AZIMER Tender Pipeline - Pilot`
20. Проверить после прогона: `sales_parser_runs`, `sales_tenders`, `sales_lead_scores`, `sales_pipeline`, Telegram A/B alerts
21. Если smoke-test OK — оставить будничный schedule `0 8 * * 1-5` и мониторить первые 2-3 запуска
22. По первой реальной сделке запустить manual workflow `AZIMER Project Folder - Pilot`
23. Создать/подключить первую папку сделки по Lead ID и проверить `sales_project_folders`

---

## File index

### Код проекта (azimer-site/)

**Pages (app/):**
- `app/page.tsx` — главная (без Testimonials)
- `app/kp/page.tsx` — детальный КП с print→PDF
- `app/estimate/` — мастер расчёта
- `app/about/page.tsx` — без дубля H2
- `app/console-x9p4m2/` — админка
  - `page.tsx` — дашборд
  - `leads/page.tsx` — список
  - `leads/view/page.tsx` — карточка + отправка SMS/Email + история
  - `catalog/page.tsx` — каталог цен + кнопка «🚀 Опубликовать»
  - 🆕 `templates/page.tsx` — управление шаблонами SMS/Email

**Admin shared:**
- `components/admin/AdminShell.tsx` — auth + sidebar + useAdmin
- `lib/admin-api.ts` — adminFetch + типы (LeadFull, MessageTemplate, LeadMessage, и др.)

**Калькулятор (lib/calculator/):**
- `index.ts` — public API: `calculate()`, `formatRub()`, `CATALOG_VERSION`
- `engine.ts` — главный движок
- `types.ts` — TypeScript типы
- `regions.ts` — БД регионов (12 шт)
- `catalog.ts` — thin re-export из catalog.generated
- `catalog.fallback.ts` — эталон цен (закоммичен)
- `catalog.generated.ts` — авто-генерируется (gitignored)
- `consumption.ts` — нормативы расхода
- `geometry.ts`, `classifier.ts`
- `modules/walls.ts`, `roof.ts`, `frame.ts`, `foundation.ts`, `openings.ts`

**Build-time scripts:**
- `scripts/build-catalog.mts` — генерит catalog.generated.ts из Supabase (prebuild)
- `scripts/build-bot-bundle.mts` — esbuild lib/calculator → supabase/functions/_shared/calculator.bundle.js

**Supabase:**
- `supabase/schema.sql` — leads + RLS
- `supabase/migration-utm.sql` — UTM колонки
- `supabase/migration-kp-bot.sql` — kp_sessions
- `supabase/migration-catalog.sql` — catalog_items + categories + RPC
- `supabase/migration-admin-notes.sql` — notes + status_updated_at + триггер (применена 2026-05-31)
- `supabase/migration-leads-catalog-version.sql` — catalog_version в leads (применена 2026-06-02)
- 🆕 `supabase/migration-messages.sql` — message_templates + lead_messages + 6 seed (применена 2026-06-03)
- `supabase/trigger-telegram-v5.sql` — pg_net Telegram + SMS
- `supabase/functions/telegram-bot/index.ts` — Edge Function бота (импортит calculator.bundle.js из _shared/)

### Новый канал закупок (sales-pipeline/)

- `sales-pipeline/README.md` — быстрый запуск инфраструктуры
- `sales-pipeline/.env.example` — переменные окружения без секретов
- `sales-pipeline/docker-compose.n8n.example.yml` — n8n + Postgres для VPS
- `sales-pipeline/supabase/001_sales_pipeline_schema.sql` — CRM-схема закупок/комиссий
- `sales-pipeline/supabase/002_document_folders.sql` — папки сделок + storage bucket `sales-documents`
- `sales-pipeline/n8n/azimer_tender_pipeline_starter.workflow.json` — стартовый workflow
- `sales-pipeline/n8n/azimer_project_folder_starter.workflow.json` — подключение папки сделки по Lead ID
- `sales-pipeline/docs/sources-and-parser.md` — источники, ключи, reject-фильтр, скоринг
- `sales-pipeline/docs/first-wave-2026-06-08.md` — первая ручная волна: 7 Lead ID, порядок касаний, источники проверки
- `sales-pipeline/docs/document-folders.md` — структура папки сделки и доступы
- `output/build_azimer_tender_tracker.mjs` — генератор XLSX-пакета тендерных лидов
- `output/azimer_tender_leads_2026-06-08.xlsx` — актуальный XLSX: 51 raw lead / 15 shortlist / 7 first-touch
- `output/azimer_tender_leads_preview.png` — визуальное превью `Shortlist 15`
- `supabase/functions/admin-api/index.ts` — admin API (15 actions)
- `supabase/functions/_shared/calculator.bundle.js` — gitignored, генерится esbuild'ом

**Сайт components/:**
- `Header.tsx` — с GPU-layer и hysteresis против iOS jitter
- `Footer.tsx`
- `components/ui/Counter.tsx` — SSR-aware (рендерит to, не 0)
- `components/sections/Objects.tsx` — с per-image object-position
- `components/sections/Testimonials.tsx` — в репо, но не используется (убран по запросу Азамата)
- `components/sections/*` — Hero, Stats, About, Services, Audiences, Advantages, Process, Gallery, Trust, CtaFinal
- `components/estimate/RaschetWizard.tsx` — wizard UI
- `lib/supabase.ts` — submitLead с catalog_version
- `lib/pricing.ts` — wrapper для /estimate
- `lib/content.ts` — данные сайта + imgPos per-image
- `lib/utm.ts` — захват UTM в sessionStorage

### Скрипты администрирования (B:/dbtest/)

**Миграции:**
- `apply-trigger-v5-sms.mjs` — триггер v5
- `apply-catalog-migration-and-seed.mjs` — каталог + 96 seed позиций
- `apply-admin-notes.mjs` — notes колонки + триггер
- `apply-leads-catalog-version.mjs` — leads.catalog_version + индекс
- 🆕 `apply-messages-migration.mjs` — message_templates + lead_messages + 6 seed

**Калибровка / тесты:**
- `test-calculator-v2.mjs` — 3 калибровочных кейса
- `test-calc-v3-regions.mjs` — тест 12 регионов
- `test-economy-tent.mjs` — эконом-линейка
- 🆕 `calculator-matrix-review.mts` — 77 сценариев матрицы (npx tsx)
- 🆕 `engine-accuracy-tests.mts` — 117 assertion-тестов по 10 слоям
- 🆕 `dump-belyy-kub-lines.mts` — построчный дамп расчёта (паттерн для будущих)
- 🆕 `verify-generated-vs-fallback.mts` — bit-to-bit сверка
- 🆕 `sync-catalog-from-ts.mts` — одноразовый sync TS→БД (выполнен)

**Утилиты:**
- `dump-catalog.mjs` — посмотреть catalog_items
- `check-leads.mjs` — последние заявки
- `test-sms-trigger.mjs` — тест SMS отправки
- 🆕 `generate-azamat-report.py` — генератор PDF-отчёта Азамату (reportlab)

**Доступы:**
- `.tokens/gitlab.txt` — GitLab PAT (scope api, истекает 2026-07-02)
- `.tokens/supabase.txt` — Supabase access token

### Документация (B:/MyProjects/Azamat's project automation/)
- `HANDOFF.md` — этот файл
- `CLAUDE.md` — project-level правила
- `azimer-site/CLAUDE.md` → @AGENTS.md (Next.js 16 предупреждение)
- `AZIMER_Отчёт_Фаза_1_Азамату.pdf` — 🆕 12-страничный PDF отчёт (для пересылки)
- `AZIMER_Опросник_цен_Азамат.xlsx` — для Азамата
- `АЗИМЕР_Прайс_Партнёр_*.xlsx` — для поставщиков (3 файла)
- `AZIMER_Цены_Конкуренты_2026.xlsx` — рыночное исследование
- `AZIMER_Roadmap_2026.pdf` + `AZIMER_Scaling_Plan.pdf` — план масштабирования
- `AZIMER_Схема_заявки.png` — диаграмма для презентации
- `KP_2_SP_Azamat_20_05_2026_1.xlsx` — прайс материалов Азамата (источник catalog)
- `kp_preview/kp_page_1.png` + `kp_page_2.png` — реальное КП Белого Куба (1.7М)
- `AZIMER_SITE_CONTENT/` — 🆕 централизованная папка контента сайта:
  - `01_brand/`, `02_photos_selected/` (4 готовых объекта + 5 кейсов + 23 raw + AI-edits)
  - `03_cases/`, `04_services/`, `05_trust/`, `06_documents/`
  - `07_forms_crm/`, `08_site_texts/`, `09_claude_prompts/`

### llm-wiki/ (база знаний для LLM-сессий)
- `supabase/new-vs-legacy-keys.md` — `sb_publishable_` vs legacy `eyJ…`
- `supabase/edge-functions-gotchas.md` — CORS, deploy, Verify JWT
- `supabase/direct-postgres-access.md` — обход RLS через pg-direct
- `deployment/gitlab-pages-nextjs.md` — `trailingSlash:true` ловушки
- `admin/two-layer-gate-pattern.md` — gate-key + пароль для статических сайтов
- `pricing/krasnoyarsk-calculator-research-2026-06-01.md` — рыночный baseline (15+ источников)
- `pricing/build-time-catalog-snapshot.md` — как работает БД→catalog.generated цикл
- `pricing/calculator-review-2026-06-02.md` — 🆕 ревью точности vs рынок (77 сценариев, 11 рекомендаций)
- `pricing/engine-accuracy-audit-2026-06-03.md` — 🆕 117 тестов по СНиП + документация всех скрытых коэффициентов

### Live URLs
- **Сайт:** https://azimer.ru
- **Админка:** https://azimer.ru/console-x9p4m2/?k=Az9pK2m4Tn7Wq3 (далее пароль из ADMIN_PASSWORD)
- **Шаблоны:** https://azimer.ru/console-x9p4m2/templates/ (внутри админки)
- **GitLab:** https://gitlab.com/azimer1/azimer
- **GitHub mirror:** https://github.com/nickovall/azimer
- **Supabase:** https://supabase.com/dashboard/project/objgpsjyftdrhafapwvw
- **n8n VPS:** https://nickelautomata.duckdns.org
- **Telegram bot:** @azimerbot
- **Yandex.Metrika:** id 109414059
- **GitLab CI pipelines:** https://gitlab.com/azimer1/azimer/-/pipelines

---

## Credentials & Secrets

Secret values were removed on 2026-06-05 after the AZIMER technical audit.

Do not store live tokens, passwords, service role keys, webhook secrets, SMS
provider passwords, or CI trigger tokens in handoff files. Keep only variable
names and storage locations.

Rotation checklist lives in:
`B:\MyProjects\Azamat's project automation\azimer-site\docs\SECURITY_ROTATION.md`

VPS/n8n AZIMER secret file names:
- `/home/ubuntu/secret-vault/common/azimer_supabase_url`
- `/home/ubuntu/secret-vault/common/azimer_supabase_service_role_key`
- `/home/ubuntu/secret-vault/common/azimer_telegram_bot_token`
- `/home/ubuntu/secret-vault/common/azimer_telegram_chat_id`

Local token storage for admin operations:
- `B:\dbtest\.tokens\gitlab.txt`
- `B:\dbtest\.tokens\supabase.txt`

Do not print or commit values from these files.

## Glossary

- **КП** — коммерческое предложение
- **ЛСТК** — лёгкие стальные тонкостенные конструкции
- **МК** — металлоконструкции (тяжёлый прокат)
- **МДС** — методические документы в строительстве
- **НР** — накладные расходы (% от ФОТ)
- **СП** — сметная прибыль (% от ФОТ)
- **ФОТ** — фонд оплаты труда
- **СП 16.13330** — стальные конструкции
- **СП 20.13330** — снеговые/ветровые нагрузки
- **СП 24.13330** — свайные фундаменты (применили для фикса свай 2026-06-03)
- **СП 25.13330** — мерзлота
- **МДС 81-33** — нормы НР
- **МДС 81-25** — нормы СП
- **ГЭСНм** — государственные элементные сметные нормы (металлоконструкции)
- **РИМ** — ресурсно-индексный метод
- **Фаза 1** — MVP (сайт + бот + БД + админка + калькулятор + SMS/Email) — **завершена**
- **Фаза 2** — Аналитика и дожим (follow-up, 2GIS, ценовые якоря, VK-бот, GEO)
- **Фаза 3** — Команда (AmoCRM, Calendly, шаблонный калькулятор)
- **Фаза 4** — Платформа (конструктор, авто-КП с PDF, трекинг)
- **Фаза 5** — Полная автоматизация (1С, ЛК клиента, AI-квалификатор)

---

## ⚠️ Working tree

**2026-06-28 — дерево ЧИСТОЕ, всё в проде. `HEAD == origin/main == gitlab/main == 4c39c0b`.**
Последние коммиты этой сессии:
- `4c39c0b` — правка контактов лида + напоминания follow-up (см. блок в TL;DR). Миграция `20260628120000_lead_followup.sql` применена через Mgmt API; admin-api задеплоен; pipeline `#2634675729` success.
- `2db66e1` — мобильная адаптация админки (работа Codex, проверена+задеплоена Claude); pipeline `#2634071137` success.
Параллельные коммиты Codex/Ника (Turnstile + legal): `922d42d`, `c4808f0`, `5e9d9a9`, `ddbef32`, `946a086`, `124154b` — тоже в проде.
Dev-логи `.dev-admin-*.log` добавлены в `.gitignore`. Submit-lead Edge Function (Turnstile) теперь закоммичена и в проде (этап 1-2).

**2026-06-26 — комплаенс 152-ФЗ ЗАДЕПЛОЕН на прод.** Коммиты `f08d0d5` (согласие/политика/cookie/вебвизор-off) + `ac8f754` (инструкция Азамату + дата). Pipeline `#2633477986` success, live на azimer.ru (проверено: политика, чекбокс согласия, вебвизора в выдаче нет). gitlab/main == HEAD.

На момент 2026-06-24 — дерево было чистое, всё запушено. `HEAD == origin/main` (`7825b88`).

**КП — критический фикс decode (`7825b88`, ✅ ЗАДЕПЛОЕН):** настоящая причина «Не удалось загрузить данные КП» — `/kp` парсил `#data=` через `URLSearchParams`, который **превращает `+` в пробел** → сырой base64 от редактора и серверного `buildKpUrlForLead` (там `+` частый) ломался. Бот не страдал (он `encodeURIComponent`-ит base64). Фикс: ручное извлечение `data=` регуляркой + `decodeURIComponent` (работает для обоих форматов). Формат-фикс `09c2898` был нужен, но недостаточен — ссылка не открывалась всё это время. Гоча достойна llm-wiki (URLSearchParams + base64).

**КП — правка логистики (`31da10b`, ✅ ЗАДЕПЛОЕН):** убрана ложная строка «Доставка материалов в Красноярск» из «Включено» (калькулятор логистику не считает — `logisticsAdd` всегда false, `totals.logistics=0`; логистика по решению АЗИМЕР считается отдельно). В «Не входит»: «Доставка / логистика материалов (рассчитывается отдельно)».

**КП — апгрейды (2026-06-24, ✅ ЗАДЕПЛОЕНЫ):**
- `62bc4e7` — **логотип АЗИМЕР в шапке КП** (`logo-pdf.png`); печатается в PDF (header сайта скрыт `@media print`, поэтому лого в теле КП).
- `e39d448` — **редактируемая смета вручную** + убрана кнопка «Связаться с менеджером» на `/kp`. Модель «полная смета вручную»: движок даёт черновик строк с клиентскими ценами → менеджер свободно правит (название/кол-во/ед/группа/сумма, +/− строки) → итог КП = сумма. Хранится в `lead.estimate.spec` (jsonb, без миграции). `/kp` рендерит сохранённую смету, если она в ссылке, иначе пересчёт движком (обратная совместимость с ботом/старыми ссылками). Общий слой — `lib/kp-spec.ts`. admin-api `buildKpUrlForLead` прокидывает `spec` в kp_url (SMS/Email). **admin-api переразвёрнут** под этот payload. Черновик из движка точно сходится с итогом (тест: 26 строк, сумма == final). QR на `/kp` НЕ трогали (реклама на сайт — по запросу Николая).

**Фикс редактора КП (`09c2898`, ✅ ЗАДЕПЛОЕН):** кнопка «Открыть готовый КП» падала в «Не удалось загрузить данные КП» — payload был `{ state, ... }`, а `/kp` ждёт `{ input: BuildingInput }`. Вынес маппинг `WizardState→BuildingInput` в экспорт `stateToInput()` (`lib/pricing.ts`), редактор (`leads/kp`) теперь кладёт канонический payload как серверный `buildKpUrlForLead`. CI pipeline `#2623809975` success. ОТПРАВКА КП из админки (SMS/Email с `{{kp_url}}`) на серверной стороне работала и до фикса — `renderPlaceholders` → `buildKpUrlForLead` мапит state→input через `estimateStateToInput`. Полный флоу «ручной лид → КП → отправка из карточки» собран; реальная отправка ждёт только баланс SMSC + Resend domain verify (на Азамате).

**Фича «Ручное добавление лида» (2026-06-24, ✅ ЗАДЕПЛОЕНО):**
- Цель: менеджер добавляет лид руками (звонок/выставка/оффлайн) и тут же собирает КП.
- Составление/редактирование КП уже было — редактор `/console-x9p4m2/leads/kp/?id=…`. Не хватало только создания лида.
- Изменения:
  - `supabase/functions/admin-api/index.ts` — новый action `create_lead` (insert `source_channel='manual'`, `source='contact'`, status/deal_status `new`; `lead_code` MAN-… генерит БД-триггер).
  - `supabase/trigger-telegram-v6.sql` — «тихий» режим: при `source_channel='manual'` НЕ шлём ни Telegram, ни SMS (по решению Николая). v5 не трогаем, v6 = copy+guards.
  - `lib/admin-api.ts` — `createLead()` + тип `NewLeadInput`.
  - `app/console-x9p4m2/leads/new/page.tsx` — форма (имя*/телефон*/email/компания/тип/объект/коммент), 2 кнопки: «Создать» → карточка, «Создать и собрать КП» → редактор КП.
  - `app/console-x9p4m2/leads/page.tsx` — кнопка «➕ Добавить заявку» в шапке списка.
  - `B:/dbtest/apply-trigger-v6-manual-silent.mjs` — применение v6 (секреты из env, не хардкод).
- Проверено: `tsc --noEmit` чисто, `next build` чисто (25 страниц, роут `/leads/new` пререндерится).
- **Деплой выполнен 2026-06-24 в правильном порядке:**
  1. ✅ Триггер **v6** применён (`node B:/dbtest/apply-trigger-v6-manual-silent.mjs`, гварды manual=true).
  2. ✅ **admin-api** задеплоен (`supabase functions deploy admin-api --no-verify-jwt`) — `create_lead` на проде.
  3. ✅ Сайт запушен (`51e8907`), CI pipeline `#2623764378` success (183s) — форма + кнопка live.
- 🟡 **Не сделан живой клик-тест** (форма за логином админки). Николаю: открыть админку → Заявки → «➕ Добавить заявку» → создать → проверить что присвоился `MAN-…` и клиенту НЕ ушло SMS.

> ⚠️ Если в будущем сеансе снова появятся локальные коммиты — сверять `git log origin/main..HEAD`,
> а не доверять этому разделу. Push в main триггерит CI → автодеплой сайта + бота. Делать когда Николай скажет.

Последние коммиты в репо (от свежего к старому):
```
8d2263d  fix(admin): перенос длинных имён в карточках канбана       ← HEAD == origin/main
76ac489  docs(handoff): добавить раздел про обновление каталога 2026-06-15
874afa5  feat(catalog): залить дилерские цены поставщиков (2026-06-15)
608f80c  docs(llm): update contact-data email to info@azimer.ru
af2768a  chore(contacts): swap public email to info@azimer.ru
95ce821  feat(admin): standalone compose — отправка email/SMS на любой адрес
483820e  feat(email): брендированный HTML-шаблон с логотипом АЗИМЕР
5eb75d9  feat(admin): отправка с info@azimer.ru через Resend + Reply-To
2981fc8  feat(admin): кнопка «Закрыть сделку» с модалкой (День 5 UX)
972de78  feat(admin): встроенный редактор КП в карточке лида (День 4 UX)
f7be362  fix(pwa): force-static на manifest для output:export Next 16
cecbb65  feat(admin): PWA + token 30 дней (День 6+7 UX)
bdd759f  feat(admin): дашборд «Доброе утро» вместо вороночной сводки (День 3 UX)
e5057c2  feat(admin): карточка лида — CTA сверху + 8 папок документов (День 2)
a5f2de0  feat(admin): Канбан вместо таблицы заявок (День 1 UX)
ac79001  fix(ci): добавить NEXT_PUBLIC_ADMIN_GATE_KEY в build env
672859e  feat(admin): двухканальная воронка + документооборот + комиссия (Wave 1)
```

---

## Что должен сделать новый Claude в следующем сеансе

1. **Прочесть этот файл целиком** — нужен полный контекст
2. **Прочесть `CLAUDE.md` в корне** + `~/.claude/CLAUDE.md` — конвенции
3. **Зачекать git status** — должен быть чистым после этого handoff
4. **Спросить пользователя** что делаем дальше (см. Next concrete steps)
5. **Если работа с админкой** — токены доступа в `B:/dbtest/.tokens/`
6. **Если нужны live-скриншоты сайта** — попросить пользователя открыть Chrome с расширением Claude in Chrome (Chrome MCP пока не подключён)
7. **Обновить HANDOFF.md** в конце сессии под новое состояние
