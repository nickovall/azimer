# Codex Prompt: AZIMER Technical Fixes

Use this prompt in a fresh Codex session.

```text
Ты Codex, senior full-stack / DevSecOps engineer. Работай в проекте:
B:\MyProjects\Azamat's project automation\azimer-site

Сначала прочитай:
- AGENTS.md
- HANDOFF.md
- docs/llm/README.md
- docs/llm/contact-data.md
- docs/audits/2026-06-05-technical-audit.md
- B:\MyProjects\Azamat's project automation\HANDOFF.md

Не доверяй handoff автоматически. Проверяй по коду, миграциям, Edge Functions,
CI и фактическому состоянию.

Задача:
Закрыть технические и security-риски, найденные в аудите AZIMER. Дизайн/визуальные
правки не делать. Благодарственные письма/Testimonials не возвращать на сайт.

Главные правила:
- Не печатай реальные секреты.
- Не добавляй секреты в код или документацию.
- Не меняй калькуляторные формулы без явного основания.
- Не трогай дизайн, кроме минимальных error states, если это нужно для формы.
- Не меняй prod данные без отдельного разрешения.
- Не откатывай unrelated user changes.

Обязательный порядок работы:

1. Снять baseline
- git status --short
- npm run build
- проверить package.json scripts
- найти места: admin-api, telegram-bot, schema/migrations, forms, calculator,
  KP links, CI
- составить короткий implementation plan перед правками

2. P0 Security: секреты и документация
Файлы:
- HANDOFF.md files if accessible
- .env.local.example
- AGENTS.md
- supabase/functions/*
- .gitlab-ci.yml

Сделать:
- убрать реальные секреты из документации, если есть
- заменить на имена переменных без значений
- добавить docs/SECURITY_ROTATION.md с перечнем секретов к ротации без значений

Acceptance:
- rg не находит реальных токенов/паролей в repo
- документация не содержит реальные значения ADMIN_PASSWORD, service_role,
  GitLab PAT, SMSC password, Telegram bot token

3. P0 Supabase RLS / public access
Файлы:
- supabase/schema.sql
- supabase/migration-kp-bot.sql
- новая migration при необходимости

Сделать:
- включить RLS на kp_sessions
- запретить anon/auth SELECT/UPDATE/DELETE для kp_sessions
- проверить leads policies
- запретить публичному клиенту подставлять status, files, catalog_version,
  служебные поля
- catalog public read оставить только через безопасный view, если нужен

Acceptance:
- migration есть
- anon не может читать kp_sessions
- anon не может менять leads/status/catalog_version
- service-role usage остаётся только в Edge Functions

4. P0 Admin API hardening
Файлы:
- supabase/functions/admin-api/index.ts
- lib/admin-api.ts
- components/admin/AdminShell.tsx
- app/console-x9p4m2/**

Сделать:
- убрать хранение admin password в sessionStorage
- убрать пароль из body каждого admin action
- добавить login endpoint в admin-api, который выдаёт короткоживущий signed
  admin session token
- все admin actions требуют Authorization: Bearer <token>
- CORS не должен быть "*"; разрешить SITE_URL и localhost dev
- trigger_rebuild/publish требует admin session

Acceptance:
- admin password отправляется только на login
- session token имеет expiry
- CORS ограничен
- admin-api без токена возвращает 401
- build проходит

5. P0 Telegram bot
Файлы:
- supabase/functions/telegram-bot/index.ts
- scripts/build-bot-bundle.mts

Сделать:
- webhook secret обязательный в production
- пустой ADMIN_CHAT_IDS/ALLOWED_CHAT_IDS должен fail closed для админских команд
- исправить wizard /kpnew: после телефона не пропускать region
- проверить /leads /stats /find: только admin chats
- добавить понятную ошибку при отсутствии обязательных env

Acceptance:
- пустой ADMIN_CHAT_IDS/ALLOWED_CHAT_IDS не даёт доступ всем к админским командам
- webhook без secret не принимается в production
- /kpnew проходит region step
- bot bundle пересобирается

6. P1 Forms and lead integrity
Файлы:
- components/ContactForm.tsx
- components/ProjectForm.tsx
- components/PartnerForm.tsx
- components/estimate/RaschetWizard.tsx
- lib/supabase.ts

Сделать:
- формы не показывают success, если submitLead упал
- показывают понятную ошибку пользователю
- минимально нормализуют телефон
- не отправляют служебные поля, которые должен выставлять сервер/DB

Acceptance:
- при ошибке Supabase UI показывает error, не success
- lead insert payload не содержит запрещённые поля
- нет silent failure

7. P1 Calculator validation and tests
Файлы:
- lib/calculator/**
- components/estimate/RaschetWizard.tsx
- package.json
- tests/scripts

Сделать:
- добавить in-repo test:calculator для edge cases:
  zero/negative dimensions, negative openings, huge object, Norilsk/permafrost,
  seismic, crane 10/20t, cold hangar, warm warehouse, tent, foundation
  none/slab/strip/pile
- коммерчески опасные сценарии должны быть rejected или ENGINEER_REQUIRED
- не менять формулы без явного основания

Acceptance:
- npm run test:calculator проходит
- negative openings не уменьшают цену
- zero/negative dimensions не дают валидную цену
- huge/permafrost/seismic/crane-heavy сценарии помечаются ENGINEER_REQUIRED
  или требуют проверки

8. P1 KP links / hash data
Файлы:
- app/kp/page.tsx
- components/estimate/KpDownloadButton.tsx
- components/estimate/KpDocument.tsx
- lib/content.ts
- telegram-bot
- admin lead view helpers

Сделать:
- unsigned base64 из URL не должен быть авторитетным источником цены
- исправить несовпадение shape данных bot/admin/site
- добавить checksum/version или перейти на opaque KP token через DB/Edge Function
- старое КП не должно менять цену после обновления каталога либо должно явно
  показывать "пересчитано по текущему каталогу"
- добавить в generated PDF/KP QR-код на сайт AZIMER:
  - target: company.qrSiteHref / https://azimer.ru/
  - если заказчик положил брендированный PNG QR в public, использовать его
  - если файла нет, сгенерировать scan-safe QR на target URL
  - не использовать remote QR services в runtime
  - проверить, что QR виден в PDF и сканируется

Acceptance:
- невозможно подменить цену как официальную простой правкой base64
- bot/site/admin генерируют совместимый KP payload
- catalog_version/snapshot поведение явно зафиксировано
- PDF/KP содержит QR на сайт AZIMER и контактный телефон

9. CI/CD
Файлы:
- .gitlab-ci.yml
- .github/workflows/deploy.yml
- package.json

Сделать:
- добавить test:calculator в CI
- добавить lint/typecheck script, если минимально возможно
- убедиться, что build:bot-bundle запускается перед deploy telegram-bot
- admin-api deploy gap: добавить deploy step или docs/DEPLOYMENT.md с ручным шагом
- GitHub Pages workflow удалить/отключить или явно пометить legacy, если GitLab
  Pages основной

Acceptance:
- CI не выкатывает без calculator tests
- нет двух конкурирующих deploy paths без пояснения
- admin-api deploy не забывается молча

10. Финальная проверка
Запустить:
- npm run build
- npm run build:bot-bundle
- npm run test:calculator
- rg по секретам и /letters /Testimonials
- git diff --stat
- git diff review

Формат финального ответа:
- что исправлено
- какие файлы изменены
- какие проверки прошли
- что осталось TODO и почему
- какие секреты надо ротировать, без значений
```
