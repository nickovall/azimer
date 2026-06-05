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
