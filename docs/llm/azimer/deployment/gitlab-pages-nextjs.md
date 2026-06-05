# GitLab Pages + Next.js static export — ловушки

> **TL;DR:** `output: "export"` без `trailingSlash: true` → все прямые URL подстраниц отдают 404. С `trailingSlash: true` → все `<Link href>` обязаны иметь `/` в конце, иначе 301 → hard refresh → теряется SPA state.

---

## Грабля 1: Все подстраницы 404 при прямом переходе

### Симптом

```
curl https://azimer.ru/         → 200 ✅
curl https://azimer.ru/about/   → 404 ❌
curl https://azimer.ru/about    → 302 → /about/ → 404 ❌
```

Главная работает, остальное — нет. На сайте всё кликабельно потому что внутренние ссылки `<Link>` обрабатываются клиентским SPA-роутером Next.js — но если зайти по прямой ссылке / закладке / из поисковика → 404. SEO мёртвое.

### Причина

Next.js с `output: "export"` по умолчанию (без `trailingSlash`) генерирует:
```
out/about.html       ← плоский файл
out/contacts.html
out/console-x9p4m2.html
```

GitLab Pages при запросе `/about/` ищет `/about/index.html` — не находит → 404.

### Решение

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,  // ← вот это
  images: { unoptimized: true },
};
```

Теперь генерируется:
```
out/about/index.html
out/contacts/index.html
out/console-x9p4m2/index.html
```

GitLab Pages обслуживает `/about/` → находит `index.html` → 200 ✅

---

## Грабля 2: `<Link>` без `/` в конце = hard refresh

С `trailingSlash: true` Next делает 301-redirect для URL без `/`:
```
GET /admin/leads → 301 → /admin/leads/
```

Браузер при 301 — **hard refresh**, не SPA-navigation. Это:
- Сбрасывает React state (если AdminShell проверял пароль через useEffect — снова показывает форму)
- Прерывает fetch'и в момент redirect → `Failed to fetch` в консоли

### Симптом

В админке вошёл → дашборд работает → кликнул «Заявки» → выкинуло на форму пароля с ошибкой «Failed to fetch».

### Решение

Все `<Link href>` обязаны иметь trailing slash:

```tsx
// ❌ Плохо
<Link href="/console-x9p4m2/leads">Заявки</Link>
<Link href={`/console-x9p4m2/leads/view?id=${id}`}>Открыть</Link>

// ✅ Хорошо
<Link href="/console-x9p4m2/leads/">Заявки</Link>
<Link href={`/console-x9p4m2/leads/view/?id=${id}`}>Открыть</Link>
```

`?id=` идёт **после** `/`, иначе сервер всё равно делает редирект.

### Грабля в граблях

Linter / TypeScript / Next dev mode **не предупреждают** об этом. Замечаешь только когда тестируешь production через GitLab Pages (в `next dev` оба варианта работают, потому что dev-server слепляет роуты).

---

## Грабля 3: Static export не поддерживает динамические сегменты `[id]`

```
app/leads/[id]/page.tsx  ← не работает без generateStaticParams
```

Для `output: "export"` нужно либо:
- Знать заранее все `id` (через `generateStaticParams`) — не подходит для пользовательских данных
- Использовать `?id=` query параметр на статическом роуте

Делаем так:
```
app/leads/view/page.tsx  ← один статический роут
                          использует useSearchParams() для чтения ?id=
```

В коде:
```tsx
"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function PageWrapper() {
  return (
    <Suspense fallback={<p>Загружаем…</p>}>
      <Page />
    </Suspense>
  );
}

function Page() {
  const params = useSearchParams();
  const id = params.get("id");
  // ...
}
```

Suspense обязателен — без него Next.js 16 build бросает «useSearchParams should be wrapped in suspense».

---

## Грабля 4: TypeScript кэш типов после переименования папки

После `git mv app/admin → app/console-x9p4m2`:
```
Failed to type check.
Type '"/admin"' is not assignable to type 'LayoutRoutes'.
```

`.next/dev/types/` хранит старые routes из прошлого билда.

```bash
rm -rf .next && npm run build
```

---

## Чек-лист setup нового Next 16 проекта под GitLab Pages

1. `next.config.ts`:
   ```ts
   output: "export",
   trailingSlash: true,
   images: { unoptimized: true },
   ```
2. Все `<Link href="/path/">` — с `/` в конце
3. Динамические сегменты `[param]` не использовать — заменить на `?param=`
4. `.gitlab-ci.yml`:
   ```yaml
   pages:
     script:
       - npm ci
       - npm run build
       - rm -rf public && mv out public
     artifacts:
       paths: [public]
   ```
5. `out/` в `.gitignore`

## See also

- Реальный конфиг: [azimer-site/next.config.ts](../../azimer-site/next.config.ts)
- Пример роутера с `?id=`: [azimer-site/app/console-x9p4m2/leads/view/page.tsx](../../azimer-site/app/console-x9p4m2/leads/view/page.tsx)
