# lib/proposals/ — Agent overview

## Role
Assemble, authorize, HTML/PDF, and **template-editable** proposal documents (commercial/legal copy only).

## Contents
- `proposal-assembler.ts`, `proposal-types.ts`, `proposal-html.ts`, `proposal-pdf.ts` (via `pdfBrowserGate`), …
- `proposal-html-shared.ts` — brand tokens, layout context (`setProposalLayout`), section titles per identity, edit-field wrap
- `proposal-html-sections.ts` — shared section builders + data helpers (`coverBookingRows`, `uniqueUrls`, …)
- `proposal-html-shell.ts` — document wrapper + layout dispatch
- `proposal-html-closing.ts` — inclusions/exclusions table + B2C legal tables (Classic classes)
- `proposal-layouts.ts` — built-in layout registry (Classic / Modern / Compact) + descriptions
- `layouts/` — per-layout body composition, visual tokens (`--pl-*`), and extra CSS
- `proposal-content-overrides.ts` — `ProposalTemplateOverrides` + merge helpers
- `proposal-company-template.ts` — company defaults, form hydrate, layer merge
- `proposal-theme.ts` — brand/table color tokens + CSS variables
- `proposal-company-template-client.ts` / `-server.ts` — lazy GET/PUT `proposal_templates`
- `proposal-editable-harvest.ts` — DOM harvest for leftover editable HTML tests
- `proposal-boilerplate.ts` — system fallback copy

## Boundaries
- Wizard UI: `components/tour-design`. Export API: `app/api/proposals`.
- Tour narrative (title, days, overview) comes from the wizard.
- Company template (reusable) → assembler → per-draft `__proposalTemplateOverrides`.
- Layout identity is separate from company theme: `--pl-*` never overwrites `--p-brand*`.
- Preview-only `data-template-anchor` + flash CSS; PDF export does not include highlight styles.
- Do not add `proposal_templates` to `PAGE_BOOT_TABLES`; fetch on Step 5 / editor.
