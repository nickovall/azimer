# AZIMER Design And Conversion Audit

Date: 2026-06-05

Scope: public site UI only. Runtime code was not changed by this audit. Later,
customer decision was clarified: thank-you letters and testimonials must not be
published on the site.

## Evidence

Playwright screenshots were captured during the audit into:

`output/playwright/`

Important screenshots:

- `home-desktop-after-preloader.png`
- `home-mobile-after-preloader.png`
- `estimate-mobile-full-after-preloader.png`
- `contacts-mobile-full-after-preloader.png`
- `projects-desktop.png`

## Short Verdict

The site is visually coherent, but it is not yet conversion-ready for active
commercial traffic. The main weakness is not aesthetics; it is trust and direct
contact. A warm B2B lead cannot easily call, message, verify legal details, or
understand project proof without relying on a form.

The UI also contains technical design risks: a global preloader delays the first
meaningful screen, and `Reveal` animations can produce blank full-page QA
screenshots.

## Findings

### D1. Direct Contacts Are Missing From Public UI

Where:

- `app/contacts/page.tsx`
- `components/Footer.tsx`
- `components/Header.tsx`
- `lib/content.ts`

Observed issue:

- `/contacts` says direct phone and messengers will be added after agreement.
- Header and footer do not provide a direct phone/messenger path.
- `lib/content.ts` has no phone, email, WhatsApp, Telegram, address, INN, or
  OGRN fields for public display.

Updated input after audit:

- Approved phone: +7 901 600-05-65.
- Approved VK chat: `@mavlyanov2018`, `https://vk.me/mavlyanov2018`.
- Store/use these via `docs/llm/contact-data.md` and `lib/content.ts`.

Why it matters:

Commercial traffic often needs a fast trust check or a call before filling a
form. A form-only flow loses hot leads.

### D2. Global Preloader Delays The Offer

Where:

- `app/layout.tsx`
- `components/Preloader.tsx`

Observed issue:

- The preloader is mounted globally before the actual page UI.
- It can show for around 1.8 seconds on a fresh session.

Why it matters:

For a B2B lead-gen site, the first screen should show the offer and action
immediately. A brand splash is decorative latency.

### D3. Reveal Animations Can Hide Content In QA And Failure Modes

Where:

- `components/ui/Reveal.tsx`
- most public sections using `Reveal`

Observed issue:

- Full-page screenshots showed large blank zones because content starts at
  `opacity: 0` and becomes visible through `whileInView`.

Why it matters:

The site may work during normal scroll, but the content has a fragile dependency
on JS/intersection animation. This also makes automated visual QA unreliable.

### D4. Testimonials Must Not Be Used

Where:

- old `components/sections/Testimonials.tsx`
- old `lib/content.ts` `testimonials`
- old `public/letters/*`

Decision:

Customer does not want thank-you letters/customer letters/testimonials on the
site.

Implication:

Do not solve trust by returning testimonials. Use project cases, legal details,
direct contacts, real photos, process proof, and clear commercial facts.

### D5. Projects Look Like A Gallery, Not Sales Proof

Where:

- `app/projects/page.tsx`
- `lib/content.ts` `projects`

Observed issue:

Project cards contain image, tag, title, and generic text. They lack commercial
facts: region, area, year/status, scope of work, constraints, and result.

Why it matters:

For construction leads, photos alone are weak proof. Decision-makers need
evidence that the contractor has handled similar work.

### D6. Estimate Wizard Needs Better Conversion Context

Where:

- `app/estimate/page.tsx`
- `components/estimate/RaschetWizard.tsx`

Observed issue:

- Mobile `/estimate` works visually, but the user sees a 9-step process without
  a strong promise like "3-5 minutes, preliminary range and request for KP".
- There is no lightweight fallback for users who do not know parameters.

Why it matters:

Cold mobile users may abandon a long wizard if they do not understand effort and
outcome.

## Backlog Records

### UX-01 Direct Contacts And Fast Lead Path

Files:

- `lib/content.ts`
- `components/Header.tsx`
- `components/Footer.tsx`
- `app/contacts/page.tsx`

Actions:

- Add structured public contact fields: phone label/href, WhatsApp/Telegram,
  email, city/address, INN, OGRN, working hours or response time.
- Remove temporary copy about contacts being added later.
- Add direct actions on `/contacts`: call, message, email, estimate.
- Add direct contacts/legal proof to footer.
- Add mobile-friendly quick action path.
- Keep legal proof compact; do not dump every requisite into every shared UI
  block.

Acceptance criteria:

- On 390x844 `/contacts`, direct contact is visible without long search.
- Header/footer do not break on 390px, 768px, 1440px.
- No empty contact buttons render when data is missing.
- Clicks can be tracked by analytics.

### UX-02 Trust Without Testimonials And Stable Visual QA

Files:

- `app/layout.tsx`
- `components/Preloader.tsx`
- `components/ui/Reveal.tsx`
- `app/projects/page.tsx`
- `app/estimate/page.tsx`
- `components/estimate/RaschetWizard.tsx`

Actions:

- Remove or make non-blocking the global preloader.
- Make content visible by default; animations should enhance, not gate content.
- Upgrade `/projects` into case cards with facts.
- Improve `/estimate` promise, fallback, and disabled-state explanation.
- Add a compact scan-safe QR code to KP/PDF that opens the AZIMER website.
- Do not return testimonials or thank-you letters.

Acceptance criteria:

- Full-page Playwright screenshots do not contain blank sections caused by
  animation.
- `/projects` has commercial facts, not only photos.
- `/estimate` explains duration and outcome before the user starts.
- No `/letters` assets or `Testimonials` component are reintroduced.

## Seven-Day Design Plan

Day 1: collect approved phone, messenger, email, legal data, and real project
facts from owner.

Day 2: remove/blocking preloader and harden `Reveal` visibility.

Day 3: update contacts/header/footer and add direct lead paths.

Day 4: improve `/estimate` intro, fallback, and first-step clarity.

Day 5: upgrade `/projects` into case cards without testimonials.

Day 6: add analytics events and capture mobile/desktop screenshots.

Day 7: owner review, content corrections, build, deploy.
