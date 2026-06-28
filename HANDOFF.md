# AZIMER Project Handoff For LLM Sessions

This file is the local, safe entry point for Codex/Claude sessions working
inside `azimer-site`.

It intentionally contains no secret values.

## Read Order

1. `AGENTS.md`
2. `docs/llm/README.md`
3. `docs/audits/2026-06-05-technical-audit.md`
4. `docs/audits/2026-06-05-design-audit.md`
5. `docs/prompts/2026-06-05-codex-technical-fix-prompt.md` when doing technical fixes
6. `B:\MyProjects\Azamat's project automation\HANDOFF.md` only as project map, not as truth

## Critical Rules

- Do not print or copy secret values from any handoff, env file, CI variable, or
  token file.
- Treat `B:\MyProjects\Azamat's project automation\HANDOFF.md` as potentially
  stale and potentially contaminated with secrets. Verify every claim against
  code, migrations, deployed behavior, and CI.
- Project-specific audits and execution prompts belong in this repo under
  `docs/`.
- Reusable LLM patterns belong in
  `B:\Obsidian Vault\Second Brain\03-resources\llm-wiki\`.
- Customer decision: do not publish thank-you letters, customer letters,
  testimonials, or `Testimonials` sections on the public site unless the owner
  explicitly reverses this decision later.

## Work Handoff As Of 2026-06-28 (Lead contacts edit + follow-up reminders)

### TL;DR

Managers can now edit a lead's contact fields after creation and set
follow-up reminders ("call back on date X") that surface on the dashboard.
Both shipped to prod. Mobile admin pass (2026-06-27) verified and deployed.

### Current State

- [done] DB migration `supabase/migrations/20260628120000_lead_followup.sql`
  adds `follow_up_at timestamptz` + `follow_up_note text` to `leads` + partial
  index. Applied to prod via Supabase Management API.
- [done] `admin-api`: new actions `update_lead_contact` (name/phone/email/
  company/client_type/object_type/direction; name+phone can't be blanked) and
  `set_lead_followup` (ISO string or null). `follow_up_at`/`follow_up_note`
  added to `list_leads` select. Deployed via supabase CLI.
- [done] Lead card (`leads/view`): editable Contact section + "🔔 Напоминание"
  block (quick buttons tomorrow/+3d/+week, custom datetime, note, clear;
  overdue/today highlight).
- [done] Dashboard: "🔔 Напоминания на сегодня" block (overdue + due today).
- [done] Kanban card: 🔔 indicator (red if overdue).
- [done] `lib/admin-api.ts`: `follow_up_at`/`follow_up_note` on LeadRow,
  `ContactEditInput`, `updateLeadContact()`, `setLeadFollowUp()`.
- [verified] tsc clean, next build clean (25 pages), site pipeline
  `#2634675729` success.
- [todo] Live click-test behind admin password (tsc covers Next app, not the
  Deno function): open a lead → set reminder → check dashboard; edit an email.

### Key Decisions

- Reminder time is device-local (Azamat's phone is Krasnoyarsk/UTC+7) → stored
  as ISO; no separate timezone field to keep it simple.
- Reused the existing `update_lead_*` action pattern rather than a generic field
  editor, so each action validates its own inputs.

### Deferred (Nick's call)

- Client messaging via Telegram/WhatsApp ("сложности" — postponed).
- Interaction timeline (instead of overwriting the free-text notes field).
- Multi-user / lead assignment (for Azamat's incoming sales team).

### File Index

- `supabase/migrations/20260628120000_lead_followup.sql`
- `supabase/functions/admin-api/index.ts` (actions update_lead_contact, set_lead_followup)
- `lib/admin-api.ts`
- `app/console-x9p4m2/leads/view/page.tsx`
- `app/console-x9p4m2/page.tsx`
- `app/console-x9p4m2/leads/page.tsx`

## Work Handoff As Of 2026-06-27 (Mobile Admin Pass)

### TL;DR

Admin routes now have a mobile bottom nav and mobile-safe layouts for core
operator screens. Catalog editing uses cards on phones instead of a wide table.
Cookie banner and public footer are hidden on admin routes because they blocked
or polluted the mobile admin experience.

### Architecture

```text
app/layout.tsx
  +-- Header / Footer / MobileStickyCta / CookieBanner
  |
  +-- app/console-x9p4m2/layout.tsx
        |
        v
      components/admin/AdminShell.tsx
        +-- desktop Sidebar
        +-- mobile fixed bottom admin nav
        +-- useAdmin() token context
```

### Current State

- [done] `AdminShell` has mobile bottom navigation with active-state handling
  for nested admin routes.
- [done] Catalog, leads, lead detail, KP editor, templates, and compose screens
  have mobile stacking, full-width critical actions, and safer text wrapping.
- [done] Catalog page renders mobile cards while keeping the desktop table.
- [done] `CookieBanner` does not render under `/console-x9p4m2`.
- [done] Public `Footer` is hidden under `/console-x9p4m2` via
  `HideOnAdminRoutes`.
- [verified] Mobile smoke ran at 390x844 with mocked admin-api responses:
  dashboard, leads, catalog, templates, compose, lead detail, and KP editor all
  had `scrollWidth == viewport` and visible bottom admin nav.

### Key Decisions

- Chose a fixed bottom admin nav on mobile because the desktop sidebar has no
  useful mobile equivalent and the operator needs one-tap access to the five
  repeated workflows.
- Kept desktop tables where they work and added mobile-only card views only
  where tables were the actual problem, to avoid rewriting stable desktop UX.
- Mocked `admin-api` in browser smoke instead of using real credentials or prod
  API writes; this verifies responsive rendering without touching live data.

### Open Questions

- Public `Header` still comes from root layout on admin routes. It is accounted
  for by admin spacing, but a cleaner route-specific admin chrome can still be
  considered later.

### Next Concrete Steps

1. Test on a real phone with real admin credentials and real lead data.
2. Decide whether admin routes should also hide public `Header` and use an
   admin-only top bar.
3. If keeping public header, keep admin top spacing aligned with its height.

### File Index

- `components/admin/AdminShell.tsx`
- `components/CookieBanner.tsx`
- `components/HideOnAdminRoutes.tsx`
- `app/console-x9p4m2/catalog/page.tsx`
- `app/console-x9p4m2/leads/page.tsx`
- `app/console-x9p4m2/leads/view/page.tsx`
- `app/console-x9p4m2/leads/kp/page.tsx`
- `app/console-x9p4m2/templates/page.tsx`
- `app/console-x9p4m2/compose/page.tsx`

### Credentials & Access

- Browser smoke did not use real admin credentials.
- Runtime env names involved: `NEXT_PUBLIC_ADMIN_GATE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Glossary

- Mobile admin nav: fixed bottom navigation rendered by `AdminShell` for
  `/console-x9p4m2/*` on small screens.
- Admin gate: public URL/localStorage gate controlled by
  `NEXT_PUBLIC_ADMIN_GATE_KEY`; it is not the real admin session.
- Mocked admin-api smoke: Playwright run with route interception returning local
  fixture JSON for admin API calls.

## Work Handoff As Of 2026-06-10 (Wave 1 deployed)

### TL;DR

Admin leads now model two sales channels: site requests and tender leads.
MVP document storage is Google Drive URLs, not 1C integration.
**Wave 1 is live in production**: migration applied, admin-api deployed,
UI shipped via GitLab Pages. Wave 2 (n8n parser → leads integration) still
pending — see project-root HANDOFF for the plan.

### Architecture

```text
Public forms/calculator
        |
        v
public.leads
  | source_channel / lead_code / deal_status
  | kp_status / contract_status / invoice_status / payment_status
  | commission_eligible / commission_rate
  |
  +-- public.lead_documents      -> Google Drive URLs
  +-- public.deal_commissions    -> tender commission accounting
        |
        v
supabase/functions/admin-api
        |
        v
app/console-x9p4m2/leads/*
```

### Current State

- [done] SQL migration adds lead attribution, pipeline statuses, document links,
  and tender commission tables.
- [done] `admin-api` supports expanded lead list/detail, deal field updates,
  Drive document links, commission updates, and accountant notification payloads.
- [done] Leads list has filters for channel, status, source, payment, commission,
  and search by Lead ID/customer/contact/source.
- [done] Lead card shows channel, source, Lead ID, documents, KP/contract/invoice/
  payment statuses, and tender commission block.
- [done 2026-06-10] Migration `20260608090235_admin_two_channel_docflow.sql`
  applied to Supabase prod via `B:/dbtest/apply-two-channel-docflow.mjs`. All
  3 existing site leads got auto-generated `WEB-YYYYMMDD-NNNNNN` lead_code.
- [done 2026-06-10] `admin-api` Edge Function deployed via supabase CLI.
- [done 2026-06-10] UI shipped via GitLab CI to azimer.ru.
- [todo] Wave 2: extend `leads_source_check` for `'tender'`, filter trigger v5
  by `source_channel`, add n8n node that promotes A/B tenders into `leads`
  with `lead_code = AZ-T-...` preserved.

### Key Decisions

- Google Drive URLs are stored in `lead_documents` because the MVP needs a simple
  auditable link model and 1C is explicitly out of scope.
- Site leads keep the default `source_channel='site'`; tender/manual leads are
  set through admin fields so public forms do not need schema-specific changes.
- Lead IDs are generated in Postgres with `WEB/TEN/MAN-YYYYMMDD-000001` to keep
  IDs stable across UI, Edge Function, and future integrations.
- RLS is enabled on the new operational tables and public grants are revoked;
  admin access goes through the service-role Edge Function.

### Open Questions

- Final tender source taxonomy is not decided: current fields allow free-form
  source name and URL.
- Accountant handoff channel is environment-driven; actual email/SMS provider
  behavior depends on deployed Edge Function secrets.
- No 1C sync contract is defined yet.

### Next Concrete Steps

1. Run the new Supabase migration against the target project.
2. Deploy `supabase/functions/admin-api`.
3. Configure optional `ACCOUNTANT_EMAIL` / `ACCOUNTANT_PHONE` if accountant
   notifications should be sent instead of copied manually.
4. Open `/console-x9p4m2/leads/` with the admin gate key and password, then test
   one tender lead end to end: set channel, add Drive link, update commission,
   and send to accountant.

### File Index

- `supabase/migrations/20260608090235_admin_two_channel_docflow.sql`
- `supabase/functions/admin-api/index.ts`
- `lib/admin-api.ts`
- `app/console-x9p4m2/leads/page.tsx`
- `app/console-x9p4m2/leads/view/page.tsx`

### Credentials & Access

- Public build env: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_ADMIN_GATE_KEY`.
- Edge Function secrets/config: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SITE_URL`,
  `ADMIN_ALLOWED_ORIGINS`, `ACCOUNTANT_EMAIL`, `ACCOUNTANT_PHONE`, `RESEND_API_KEY`,
  `SMSC_LOGIN`, `SMSC_PASSWORD`.

### Glossary

- Site lead: inbound request from the website or calculator.
- Tender lead: lead sourced from tender platforms or tender search.
- Lead ID: human-readable operational code generated by Postgres.
- Deal status: manager-facing sales pipeline status.
- Document status: KP/contract/invoice/payment readiness for the lead card.

## Catalog Supplier Prices Update 2026-06-15

### TL;DR

Dealer prices loaded from partner pricing for sandwich panels, profiled sheet,
trim, hardware, and DorHan sectional gates. Client markup +20% remains
auto-applied by engine via `FINANCE.client_markup_pct`. Historical leads
protected by `catalog_version` snapshot — KPs created before 2026-06-15 keep
their original calculations.

### Sources

- Sandwich / proflist / trim / hardware: partner pricing on sandwich panels
- Sectional gates DorHan: OOO «Stroy-life» (Yuri Torgashin, Khakassia / Tuva /
  Krasnoyarsk), dealer price with axial automation

### Changes

- 45 price updates + 3 new positions (`wall_pir_80`, `roof_minvata_80`,
  `roof_pir_80`).
- Apply script: `B:/dbtest/apply-supplier-prices-2026-06-15.mjs`
- Source tag in `catalog_items`: `supplier-prices-2026-06-15`
- New `CATALOG_VERSION` after rebuild: `db-snapshot-2026-06-15-...`

### Key Shifts

- Gates: ×2-3 (placeholder was severely underpriced)
- PIR panels: +25..+44% (premium insulation was undervalued)
- Mineral wool: -2..-7%
- Profiled sheet H60: +16..+38%
- Seal tape: -96% (fixed placeholder bug: 360 → 15 RUB/m)

### Verification

- 115/117 accuracy assertions pass (same 2 baseline `tent_arched` fails as
  before the change — gate-price-hardcoded asserts in
  `B:/dbtest/engine-accuracy-tests.mts` were switched to name-based matching).
- `typecheck` clean, `next build` clean (24 static pages).

### Open Items

- Wave 2 of supplier pricing: doors, windows, metal, contractor works, facade —
  see project-root HANDOFF for the supplier follow-up list.
- Bot wizard upgrade («gate with/without automation», expanded proflist
  selection) deferred until full supplier set arrives — to be done as one
  commit so the wizard schema only migrates once.

## Current State As Of 2026-06-05

- Public site is a Next.js static export deployed through GitLab Pages.
- Supabase Postgres and Edge Functions back the lead/admin/bot flows.
- Telegram bot, admin API, calculator, catalog generation, and CI have P0/P1
  issues documented in `docs/audits/2026-06-05-technical-audit.md`.
- Design/conversion audit is documented in
  `docs/audits/2026-06-05-design-audit.md`.
- Technical remediation prompt for a future Codex session is in
  `docs/prompts/2026-06-05-codex-technical-fix-prompt.md`.
- Design remediation prompt for a future Claude session is in
  `docs/prompts/2026-06-05-claude-design-fix-prompt.md`.
- Verified public legal data for footer/contact/trust blocks is in
  `docs/llm/legal-data.md`.
- Approved public phone/VK contact data and QR target are in
  `docs/llm/contact-data.md`.

## Do Not Use As Truth

This file is a routing and safety file. The codebase, SQL migrations, deployed
Supabase state, and CI configuration are the actual source of truth.
