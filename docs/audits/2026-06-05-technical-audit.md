# AZIMER Technical Audit

Date: 2026-06-05

Scope: architecture, security, Supabase, database schema/migrations, calculator,
Telegram bot, admin console, CI/CD, forms, KP links, SEO/conversion risks.

This document is a project-specific artifact for future Codex sessions. It
contains no secret values.

## Short Verdict

The project is functional but not ready for active traffic without security and
integrity fixes. The main risk is not the Next.js static architecture; it is the
trusted boundary around Supabase, admin actions, Telegram bot, KP payloads, and
public inserts.

The dangerous pattern is repeated: the public/client side can influence fields
that should be server-owned, while privileged Edge Functions rely on shared
secrets and weak session handling.

## P0 Critical Issues

| ID | Problem | Where | Why Dangerous | How To Verify | Fix |
|---|---|---|---|---|---|
| P0-01 | Secret value documented | `B:\MyProjects\Azamat's project automation\HANDOFF.md` | Anyone reading handoff can access admin if password is current | Search for secret names, do not print values | Remove values, rotate affected secrets |
| P0-02 | `kp_sessions` publicly readable | `supabase/migration-kp-bot.sql`, live PostgREST check | Public anon can read KP/session state | anon REST `kp_sessions?select=*` | Enable RLS, deny anon/auth read/write |
| P0-03 | Public leads insert accepts server-owned data | `supabase/schema.sql`, `lib/supabase.ts` | Attacker can forge lead status, estimate, catalog_version, files | anon insert payload with extra fields | Restrict insert policy/columns; server defaults |
| P0-04 | Admin API uses service role with shared password in body | `supabase/functions/admin-api/index.ts`, `lib/admin-api.ts`, `components/admin/AdminShell.tsx` | Stolen password/sessionStorage gives broad privileged access | Inspect request body/sessionStorage | Add login endpoint and short-lived admin token |
| P0-05 | Admin API CORS is too broad | `supabase/functions/admin-api/index.ts` | Any origin can attempt privileged calls | Inspect CORS headers | Restrict to `SITE_URL` and local dev |
| P0-06 | Telegram bot admin auth can fail open | `supabase/functions/telegram-bot/index.ts` | Empty `ALLOWED_CHAT_IDS` allows public access to admin commands; webhook secret optional | Deploy with empty env and test admin commands | Fail closed for admin commands; require webhook secret in production |
| P0-07 | `/kp#data=` is unsigned base64 | `app/kp/page.tsx`, bot/admin KP helpers | User can alter KP input/price context in URL | Edit hash payload | Use signed/opaque token or clear "not official" behavior |
| P0-08 | Bot `/kpnew` skips region after phone | `supabase/functions/telegram-bot/index.ts` | Norilsk/permafrost/regional loads can be omitted | Walk wizard manually | Fix step transition and tests |

## P1 High Priority Issues

| ID | Problem | Where | Risk | Fix |
|---|---|---|---|---|
| P1-01 | Forms show success even when Supabase submit fails | `ContactForm`, `ProjectForm`, `PartnerForm`, `RaschetWizard` | Lost leads with false success | Show error, only success after confirmed insert |
| P1-02 | File upload/signed URL behavior too permissive | upload flow, Supabase storage policies | Long-lived file URLs and unsafe uploads | MIME/size validation, shorter signed URLs |
| P1-03 | Calculator edge cases not covered in repo CI | `lib/calculator/**`, package scripts | Commercially unsafe prices | Add in-repo `test:calculator` |
| P1-04 | Negative openings can reduce price | calculator openings/engine path | Underpricing | Clamp/reject invalid openings |
| P1-05 | Zero/negative dimensions produce invalid results | calculator and wizard validation | Invalid KP/lead data | Reject before calculation and in engine |
| P1-06 | Huge/permafrost/seismic/crane cases need stronger engineer gating | calculator classifier/regions/foundation | Under-scoped estimate | Mark `ENGINEER_REQUIRED` or reject |
| P1-07 | Catalog version is not a price snapshot | DB, `app/kp/page.tsx`, bot/admin KP links | Old KP changes after catalog update | Store snapshot or display current-recalc warning |
| P1-08 | CI deploys bot but not admin-api | `.gitlab-ci.yml` | Admin code can drift from deployed function | Deploy admin-api or document manual step |
| P1-09 | No tests/lint/typecheck in CI | `package.json`, `.gitlab-ci.yml` | Broken logic can ship | Add scripts and CI gates |
| P1-10 | GitHub Pages workflow competes with GitLab Pages | `.github/workflows/deploy.yml` | Deployment drift | Remove/disable or mark legacy |

## P2 Medium Priority Issues

| ID | Problem | Where | Risk | Fix |
|---|---|---|---|---|
| P2-01 | `catalog_items` has weak active price constraints | `supabase/migration-catalog.sql` | Duplicate active prices/race conditions | Unique active key/index, transactional update |
| P2-02 | Public catalog may expose internal fields | catalog views/policies | Vendor/source leak | Public view with only needed fields |
| P2-03 | No audit log for admin actions | admin-api/admin console | Hard to trace mistakes | Add lead/status/catalog audit table |
| P2-04 | Trigger-based SMS can be abused through public insert | DB trigger + leads policy | Cost/spam risk | Server-side validation/rate limit |
| P2-05 | External calculator tests live outside repo | `B:\dbtest\engine-accuracy-tests.mts` | CI cannot enforce them | Move/adapt into repo |

## Security Checklist

Checked:

- Secret names and likely storage locations.
- Supabase RLS from migrations and live anon behavior.
- Admin API auth/CORS/service role usage.
- Telegram bot allowed chats and webhook handling.
- Public forms and lead insert behavior.
- KP URL payload integrity.
- CI/CD deploy paths.

Not fully verified:

- GitLab protected/masked variables beyond visible variable names.
- Full live Supabase policies after all migrations unless re-queried.
- Cloudflare DNS/security headers.
- SMSC/Resend live provider behavior.

Rotate/remove, without printing values:

- Admin password.
- Supabase access token.
- GitLab personal access token.
- Supabase Postgres password.
- SMSC password.
- Telegram bot token.
- Telegram webhook secret.
- GitLab trigger token.
- Supabase service role key if it was exposed.

Do not rotate:

- Public Supabase URL.
- Public anon/publishable key, unless policy changes require it.
- Site URL.
- Yandex Metrika ID.

## Database Review

Important tables:

- `leads`
- `kp_sessions`
- `catalog_items`
- `catalog_categories`
- `message_templates`
- `lead_messages`

Findings:

- `kp_sessions` was created without effective RLS and was publicly readable.
- `leads` public insert is too broad for server-owned fields.
- `catalog_items` history uses `valid_from/valid_to`, but active uniqueness and
  race protection need stronger constraints.
- `catalog_version` is a label, not a replayable price snapshot.
- Old KP can change if recalculated with current catalog/date logic.

Required fixes:

- Add migration for `kp_sessions` RLS.
- Restrict `leads` accepted public fields.
- Move server-owned fields to server/DB defaults.
- Add catalog constraints for active rows.
- Decide whether KP uses immutable snapshot or explicit current recalculation.

## Calculator Review

Observed:

- 117 external tests passed in `B:\dbtest`, but they are outside repo and CI.
- Repo has no real `npm test`, lint, or typecheck gate.
- Negative openings can reduce price.
- Zero/negative dimensions are not safely rejected everywhere.
- Huge object can produce huge price without sufficient engineer gating.
- Unknown region falls back to Krasnoyarsk-like defaults.
- Winter surcharge depends on current date.
- Several prices/norms are hardcoded and need explicit owner validation.

Tests to add:

- zero and negative dimensions;
- negative openings;
- huge object;
- Norilsk/permafrost;
- seismic;
- crane 10/20t;
- cold hangar;
- warm warehouse;
- tent;
- foundation none/slab/strip/pile;
- invalid/unknown region;
- catalog snapshot behavior.

Engineer-required scenarios:

- permafrost/pile complexity;
- high seismic;
- heavy cranes;
- very large spans/areas/heights;
- unsupported regions;
- invalid/uncertain foundation;
- tent/non-standard envelope;
- any invalid input that still attempts pricing.

## Telegram Bot Review

Findings:

- Empty `ADMIN_CHAT_IDS`/`ALLOWED_CHAT_IDS` must not allow everyone into admin commands.
- Webhook secret must be mandatory in production.
- `/kpnew` wizard skipped region after phone in the audited flow.
- `/leads`, `/stats`, `/find` expose lead data through service-role path and
  must require admin chat.
- Bot KP payload shape can diverge from site/admin.

Required fixes:

- Fail closed on empty allowed list.
- Require webhook secret in production.
- Add wizard regression tests.
- Align KP payload shape across site/bot/admin.

## Admin Review

Findings:

- Gate key is client-side obscurity, not security.
- Admin password is stored in `sessionStorage`.
- Password is sent in body for each admin action.
- Admin API uses service-role for many actions.
- CORS is broad.
- No durable audit log for important actions.
- Catalog editor can create business-damaging price mistakes.

Required fixes:

- Login endpoint with short-lived token.
- `Authorization: Bearer` for privileged actions.
- Restricted CORS.
- Audit log for status, notes, catalog, templates, send SMS/email, publish.
- Confirmation/validation for catalog changes.

## CI/CD Review

Findings:

- GitLab CI runs build and bot bundle but lacks tests/lint/typecheck.
- Admin API deploy gap exists.
- GitHub Pages workflow can drift from GitLab Pages.
- No staging/rollback strategy.

Required fixes:

- Add `test:calculator`.
- Add basic typecheck/lint if possible.
- Add or document admin-api deployment.
- Disable/mark legacy GitHub Pages workflow if GitLab Pages is source of truth.
- Add rollback notes.

## Product/Business Risks

Must close before traffic:

- Direct lead integrity and form false-success.
- Public RLS gaps.
- Admin API hardening.
- Bot fail-closed auth.
- Calculator invalid-input safeguards.
- KP payload integrity.

Can defer:

- Full staging environment.
- Advanced admin audit analytics.
- Large redesign.
- Non-essential feature additions.

Do not do now:

- Reintroduce thank-you letters/testimonials.
- Rewrite the calculator from scratch.
- Build new dashboards before closing P0/P1 security and lead integrity.
