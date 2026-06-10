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
