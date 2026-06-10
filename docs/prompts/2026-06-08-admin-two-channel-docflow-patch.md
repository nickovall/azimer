# Patch Brief: Админка для двух каналов продаж + документооборот

Дата: 2026-06-08  
Статус: ТЗ на будущий патч, код пока не менять

## Цель

Расширить админку AZIMER так, чтобы она работала с двумя каналами продаж:

1. `site` — заявки с сайта, калькулятора, формы проекта, партнерской формы.
2. `tender` — лиды из закупок/тендеров, найденные внешней системой Николая.

Админка должна показывать источник лида, вести сделку по статусам, хранить документы через Google Drive/другое хранилище и давать бухгалтеру возможность отмечать счет/оплату без интеграции с 1С на первом этапе.

## Success Criteria

- В админке видно, откуда пришел лид: сайт или тендерный канал.
- Все лиды можно смотреть в общей воронке, но фильтровать по каналу.
- У каждой сделки есть `Lead ID` / `Project ID`.
- В карточке сделки есть блок документов: ТЗ, КП, договор, счет, акт, оплата, переписка.
- Азамат может загрузить КП/договор и нажать `Отправить бухгалтеру`.
- Бухгалтер получает уведомление и может отметить `счет выставлен`, `оплачено`.
- По тендерным лидам отдельно считается комиссия Николая.
- 1С не подключается на MVP, но структура данных готова к интеграции позже.

## Основной принцип

Лиды приходят из разных каналов, но после принятия в работу становятся общей сделкой.

```text
site lead   -> deal -> documents -> invoice -> payment
tender lead -> deal -> documents -> invoice -> payment -> commission
```

## UI: Админка

### 1. Навигация

Добавить/переосмыслить разделы:

| Раздел | Назначение |
|---|---|
| `Заявки` | все входящие лиды |
| `Заявки с сайта` | фильтр `source_channel = site` |
| `Закупки / тендеры` | фильтр `source_channel = tender` |
| `Сделки` | все лиды, принятые в работу |
| `Документы` | общий список документов по сделкам |
| `Комиссии` | только сделки с `commission_eligible = true` |

На MVP можно не делать отдельные страницы для всех разделов, а добавить фильтры и блоки в текущие `/leads` и `/leads/view`.

### 2. Список лидов

В таблице лидов добавить колонки:

| Колонка | Пример |
|---|---|
| `Канал` | `Сайт`, `Тендер` |
| `Lead ID` | `WEB-20260608-001`, `TEN-20260608-001` |
| `Источник` | `estimate`, `contact`, `EnergyBase`, `B2B-Center` |
| `Заказчик` | ООО НХТК |
| `Статус сделки` | КП отправлено |
| `Документы` | 3 файла |
| `Сумма КП` | 4 800 000 ₽ |
| `Оплата` | нет / частично / оплачено |
| `Комиссия` | да / нет |

Фильтры:

- канал: `all`, `site`, `tender`, `manual`
- статус сделки
- есть/нет КП
- есть/нет счет
- оплачено/не оплачено
- комиссия: да/нет

### 3. Карточка лида / сделки

Добавить верхний блок атрибуции:

| Поле | Что показывает |
|---|---|
| `Lead ID` | постоянный ID сделки |
| `Канал` | сайт / тендер / ручной |
| `Первичный источник` | форма сайта, EnergyBase, B2B-Center |
| `Кем создан` | site, n8n, Николай |
| `Комиссионный лид` | да/нет |
| `Ставка комиссии` | например 5% |

Добавить блок `Документы`:

| Тип документа | Действие |
|---|---|
| ТЗ | загрузить / открыть |
| КП | загрузить / отправить заказчику / отметить одобрено |
| Договор | загрузить / отправить бухгалтеру |
| Счет | загрузить / отметить выставлен |
| Акт | загрузить |
| Оплата | загрузить подтверждение / отметить оплачено |
| Переписка | прикрепить скрин/письмо |

Добавить кнопки:

- `Создать папку сделки`
- `Открыть папку в Google Drive`
- `Загрузить документ`
- `Отправить бухгалтеру`
- `Счет выставлен`
- `Оплата получена`
- `Комиссия выплачена`

## Статусы сделки

| Статус | Кто меняет | Что значит |
|---|---|---|
| `new` | система | лид создан |
| `accepted` | Азамат | взял в работу |
| `measurement_done` | Азамат | выезд/замеры сделаны |
| `tz_received` | Азамат / сметчик | ТЗ получено |
| `kp_preparing` | Азамат / сметчик | КП готовится |
| `kp_sent` | Азамат | КП отправлено |
| `kp_approved` | Азамат | заказчик одобрил КП |
| `sent_to_accountant` | Азамат | передано бухгалтеру |
| `invoice_issued` | бухгалтер | счет выставлен |
| `paid_partial` | бухгалтер | частичная оплата |
| `paid_full` | бухгалтер | полная оплата |
| `won` | Азамат / бухгалтер | сделка выиграна |
| `lost` | Азамат | сделка проиграна |
| `commission_paid` | Николай | комиссия выплачена |

## Данные: минимальная модель

### Расширить существующую `leads`

Добавить поля:

```sql
source_channel text not null default 'site'
  check (source_channel in ('site', 'tender', 'manual'));

lead_code text unique;
external_source text;
external_source_url text;
created_by_system text;

deal_status text;
project_folder_url text;

commission_eligible boolean not null default false;
commission_rate numeric(6, 4) not null default 0;
commission_notes text;
```

Правило:

- заявки сайта получают `source_channel = site`;
- тендерные лиды получают `source_channel = tender`;
- ручные сделки получают `source_channel = manual`;
- комиссия Николая включается только для `source_channel = tender` и `commission_eligible = true`.

### Новая таблица `lead_documents`

```sql
create table lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  lead_code text,
  created_at timestamptz not null default now(),
  doc_type text not null check (
    doc_type in ('tz', 'kp', 'contract', 'invoice', 'act', 'payment', 'mail', 'drawing', 'other')
  ),
  title text not null,
  file_url text,
  storage_provider text not null default 'google_drive',
  storage_path text,
  amount numeric(14, 2),
  currency text not null default 'RUB',
  uploaded_by text,
  sent_to_accountant_at timestamptz,
  notes text
);
```

### Новая таблица `deal_commissions`

```sql
create table deal_commissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references leads(id) on delete cascade,
  lead_code text,
  commission_rate numeric(6, 4) not null default 0.0500,
  kp_amount numeric(14, 2) not null default 0,
  invoice_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  commission_due numeric(14, 2) generated always as (round(paid_amount * commission_rate, 2)) stored,
  commission_paid numeric(14, 2) not null default 0,
  payment_status text not null default 'not_paid'
    check (payment_status in ('not_paid', 'partial', 'paid')),
  notes text,
  updated_at timestamptz not null default now()
);
```

### Новая таблица `lead_events`

Если текущей истории статусов недостаточно:

```sql
create table lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  lead_code text,
  created_at timestamptz not null default now(),
  event_type text not null,
  created_by text,
  comment text,
  payload jsonb not null default '{}'::jsonb
);
```

## Google Drive / хранилище

На MVP файлы можно хранить в Google Drive, а в Supabase хранить только ссылки.

Структура папки сделки:

```text
<Lead ID>__<Заказчик>__<Объект>
  01_TZ
  02_KP_i_smety
  03_Dogovory
  04_Scheta
  05_Akty
  06_Oplaty
  07_Perepiska
  08_Foto_i_chertezhi
```

В карточке сделки хранить:

- `project_folder_url`
- ссылки на конкретные документы
- тип документа
- сумма, если документ финансовый
- кто загрузил
- когда отправлено бухгалтеру

## Роли

Текущая защита админки через скрытый URL + пароль подходит для одного человека, но для бухгалтера/сметчика нужны роли.

MVP-вариант:

| Роль | Доступ |
|---|---|
| `admin` | всё |
| `azamat` | все сделки, документы, статусы |
| `nikolay` | все тендерные лиды, комиссии, документы по ним |
| `accountant` | договоры, счета, акты, оплаты |
| `estimator` | ТЗ, КП, сметы, чертежи |

На первом патче можно сделать упрощенно:

- один пароль для админки;
- отдельный accountant key для бухгалтерского режима;
- позже перейти на нормальную авторизацию Supabase Auth.

## Уведомления

### При `КП одобрено`

Сообщение Азамату/Николаю:

```text
КП одобрено
Lead ID: TEN-20260608-001
Заказчик: ООО НХТК
Сумма КП: 4 800 000 ₽
Следующий шаг: отправить бухгалтеру
```

### При `Отправить бухгалтеру`

Сообщение бухгалтеру:

```text
Нужно выставить счет
Lead ID: TEN-20260608-001
Заказчик: ООО НХТК
Сумма: 4 800 000 ₽
Папка сделки: <link>
КП: <link>
```

### При `Оплата получена`

Сообщение Николаю:

```text
Оплата по тендерному лиду
Lead ID: TEN-20260608-001
Поступило: 2 000 000 ₽
Комиссия 5%: 100 000 ₽
```

## Каналы продаж

| Канал | `source_channel` | Комиссия Николая |
|---|---|---|
| Сайт | `site` | нет, если отдельно не согласовано |
| Тендеры / закупки | `tender` | да |
| Ручные лиды | `manual` | вручную по договоренности |

## Что не делать в MVP

- Не подключать 1C сразу.
- Не строить полноценную ERP.
- Не хранить service role key в браузере.
- Не давать бухгалтеру полный доступ ко всей админке без ролей.
- Не смешивать файлы без `Lead ID`.

## Порядок реализации

1. Добавить поля канала и атрибуции в `leads`.
2. Добавить `lead_documents`.
3. Добавить `deal_commissions`.
4. Добавить UI-фильтр `Канал` в список лидов.
5. Добавить блок `Источник / Канал / Комиссия` в карточку лида.
6. Добавить блок `Документы`.
7. Добавить загрузку/ссылку Google Drive файла.
8. Добавить кнопку `Отправить бухгалтеру`.
9. Добавить статусы `kp_approved`, `sent_to_accountant`, `invoice_issued`, `paid_partial`, `paid_full`.
10. Добавить Telegram/email уведомления бухгалтеру и Николаю.
11. Добавить вкладку/фильтр `Комиссионные сделки`.
12. После первого успешного счета решить вопрос 1C.

## Формулировка для Азамата

Админка будет работать как общий операционный кабинет по двум каналам: заявки с сайта и закупки. В каждой карточке будет видно, откуда пришел лид, кто его ведет, какие документы загружены, отправлено ли КП, передано ли бухгалтеру, выставлен ли счет и пришла ли оплата. На первом этапе документы храним в Google Drive, а в админке фиксируем ссылки, статусы и суммы. 1C подключаем позже, когда процесс будет отлажен.
