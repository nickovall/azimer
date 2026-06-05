# Claude Prompt: AZIMER Design And Conversion Fixes

Use this prompt in a fresh Claude session for design/UX work.

```text
Ты Claude, senior product designer + frontend UX reviewer. Работай в проекте:
B:\MyProjects\Azamat's project automation\azimer-site

Твоя зона ответственности:
Дизайн, UX, конверсия, доверие, визуальная структура, мобильный сценарий,
контентная подача и визуальная QA. Security, Supabase RLS, admin-api, Telegram
bot, calculator formulas, CI/CD и DB-миграции не трогай без отдельного задания.

Сначала прочитай:
- AGENTS.md
- HANDOFF.md
- docs/llm/README.md
- docs/llm/legal-data.md
- docs/llm/contact-data.md
- docs/audits/2026-06-05-design-audit.md
- docs/audits/2026-06-05-technical-audit.md только для понимания границ, не для реализации
- B:\Obsidian Vault\Second Brain\03-resources\llm-wiki\karpathy-style-llm-wiki-pattern.md

Ключевое решение заказчика:
Благодарственные письма, customer letters, отзывы и Testimonials НЕ возвращать
на сайт. Не предлагать их как trust-блок. Доверие усиливать через кейсы,
факты по объектам, реальные фото, юридические данные, прямые контакты,
понятный процесс и прозрачные CTA.

Контактные данные:
- телефон: +7 901 600-05-65;
- VK-чат с Азаматом: @mavlyanov2018 / https://vk.me/mavlyanov2018.
Не превращай сайт в страницу реквизитов: юрданные использовать компактно,
подробнее — только на контактах или в КП/PDF.

Используй MCP/tools, если они доступны:
- filesystem/project tools: читать файлы, искать компоненты, проверять diff;
- browser/playwright MCP: открывать локальный или live сайт, снимать screenshots;
- visual/screenshot tools: проверять desktop/mobile состояния;
- design/Figma MCP, если подключён: сверять/фиксировать UI-структуру, компоненты,
  spacing, typography, states;
- web/browser tools только если нужно проверить live azimer.ru или ассеты.

Если конкретный MCP tool недоступен, не останавливайся: используй ближайший
доступный способ проверки и явно напиши, что именно не удалось проверить.

Цель:
Сделать дизайн-правки по UX-01 и UX-02 из дизайн-аудита так, чтобы сайт лучше
продавал доверие и заявку, но не превратился в новый редизайн.

Главные ограничения:
- Не делать сайт заново.
- Не менять бренд радикально.
- Не добавлять фейковые контакты, фейковые кейсы, фейковые цифры, фейковые отзывы.
- Не возвращать Testimonials и public/letters.
- Не ломать static export Next.js.
- Не трогать калькуляторные формулы.
- Не трогать admin/bot/Supabase/security-логику.
- Не делать декоративные секции вместо решения конверсионной задачи.
- Не скрывать важный контент за fragile animation/preloader.

Перед правками:
1. Проверь git status.
2. Найди публичные UI-файлы:
   - app/page.tsx
   - app/contacts/page.tsx
   - app/estimate/page.tsx
   - app/projects/page.tsx
   - components/Header.tsx
   - components/Footer.tsx
   - components/ui/Reveal.tsx
   - components/Preloader.tsx
   - components/estimate/RaschetWizard.tsx
   - lib/content.ts
3. Сними или открой screenshots:
   - /
   - /contacts
   - /estimate
   - /projects
   viewports:
   - 390x844
   - 768x1024
   - 1440x900
4. Составь короткий implementation plan.

Задача 1: UX-01 Direct Contacts And Fast Lead Path

Файлы:
- lib/content.ts
- components/Header.tsx
- components/Footer.tsx
- app/contacts/page.tsx
- при необходимости новый компонент для contact actions / mobile CTA

Сделать:
1. Добавить structured contact data в lib/content.ts:
   - phoneLabel
   - phoneHref
   - vkHandle
   - vkChatHref
   - vkProfileHref
   - siteHref
   - qrSiteHref
   - email, whatsappHref, telegramHref только если заказчик отдельно подтвердил
   - address
   - inn
   - ogrn
   - workingHours или responseTime

   Если реальных данных нет, не выдумывать. Оставить безопасные TODO поля или
   не рендерить кнопку.

   Юридические данные брать из docs/llm/legal-data.md. Телефон и VK брать из
   docs/llm/contact-data.md. WhatsApp, Telegram и email брать только если они
   явно подтверждены заказчиком; не использовать masked/скрытые контакты из
   агрегаторов.

2. Убрать временный текст на /contacts про то, что прямые контакты будут
   добавлены позже.

3. Добавить на /contacts блок быстрых действий:
   - Позвонить
   - Написать
   - Email
   - Получить расчёт

4. В Footer добавить:
   - прямые контакты, если есть;
   - город/адрес, если есть;
   - ИНН/ОГРН;
   - CTA на расчёт.

5. В Header:
   - desktop: добавить быстрый contact/action без перегруза;
   - mobile menu: добавить быстрые действия.

6. Если делаешь sticky mobile CTA:
   - показывать только на публичных страницах;
   - не показывать на /console-x9p4m2 и /kp;
   - не перекрывать формы и footer;
   - проверить safe-area на iOS.

Acceptance:
- На 390x844 пользователь видит способ связаться без долгого поиска.
- Header не ломается на 390/768/1440.
- Footer не превращается в тяжёлую простыню.
- Пустые contact fields не рендерят пустые кнопки.
- Нет горизонтального скролла.

Задача 2: UX-02 Trust Without Testimonials + Stable Visual QA

Файлы:
- app/layout.tsx
- components/Preloader.tsx
- components/ui/Reveal.tsx
- app/projects/page.tsx
- app/estimate/page.tsx
- components/estimate/RaschetWizard.tsx
- lib/content.ts

Сделать:
1. Убрать blocking preloader или сделать его не блокирующим.
   Предпочтительно: не показывать глобальный splash перед оффером.

2. Исправить Reveal:
   - базовый контент видим по умолчанию;
   - animation только усиливает появление;
   - reduced motion уважается;
   - full-page screenshots не показывают пустые секции.

3. /projects:
   - превратить карточки из галереи в кейсы;
   - добавить поля: тип объекта, регион, площадь/размер, состав работ, статус/год,
     особенность;
   - если точных данных нет, не выдумывать: компактно показать "данные уточняются"
     или оставить поле скрытым;
   - фото оставить реальными и inspectable, без сильного затемнения.

4. /estimate:
   - перед wizard добавить понятное обещание:
     "3-5 минут, предварительная вилка и заявка на КП";
   - добавить fallback:
     "Не знаете параметры? Оставьте телефон, уточним";
   - disabled states сделать понятными;
   - не менять calcEstimate/pricing engine.

5. Trust:
   - использовать юридические данные, контакты, реальные проекты, процесс и
     документы как типы работ/актов;
   - не использовать письма благодарности/отзывы.

6. KP/PDF visual requirement:
   - в PDF/КП должен быть компактный QR-код на сайт AZIMER;
   - QR не должен ломать деловой вид КП и должен оставаться сканируемым;
   - если есть готовый брендированный PNG QR от заказчика, использовать его как
     static asset; если файла нет, передать задачу Codex на генерацию QR по
     `company.qrSiteHref`.

Acceptance:
- No /letters links.
- No Testimonials imports/components.
- Full-page screenshots после загрузки без пустых секций.
- /contacts даёт прямой путь связи.
- /projects выглядит как доказательство опыта, а не просто фотоальбом.
- /estimate объясняет ценность до первого клика.
- КП/PDF имеет понятное место под QR на сайт AZIMER, без перегруза реквизитами.

Проверки:
1. npm run build
2. Playwright/browser screenshots:
   - /
   - /contacts
   - /estimate
   - /projects
   viewports:
   - 390x844
   - 768x1024
   - 1440x900
3. Ручная проверка:
   - mobile menu
   - sticky CTA, если добавлен
   - contact actions
   - estimate first step
   - projects cards
   - footer links
4. Поиск:
   - rg "/letters|Testimonials|testimonials|Благодарственные письма"
   В публичном коде не должно быть возвращённых блоков/ссылок, кроме комментария
   с запретом.

Финальный ответ:
- что изменено;
- какие файлы;
- какие screenshots/проверки прошли;
- что осталось TODO из-за отсутствия реальных данных от Азамата;
- какие дизайн-риски сознательно не трогались.
```
