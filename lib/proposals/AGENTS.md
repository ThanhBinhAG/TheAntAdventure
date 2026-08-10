# lib/proposals/ — Agent overview

## Role
Assemble, authorize, HTML/PDF, and **template-editable** proposal documents (commercial/legal copy only).

## Contents
- `proposal-assembler.ts`, `proposal-types.ts`, `proposal-html.ts`, `proposal-pdf.ts`, …
- `proposal-content-overrides.ts` — `ProposalTemplateOverrides` + merge helpers
- `proposal-editable-harvest.ts` — DOM harvest for template fields only
- `proposal-boilerplate.ts` — default company copy

## Boundaries
- Wizard UI: `components/tour-design`. Export API: `app/api/proposals`.
- Tour narrative (title, days, overview) comes from the wizard; Step 5 edits template fields only.
- Per-draft template/notes/rates live under `brief_json.__proposal*` (see `lib/tour-design/tour-draft-utils.ts`).
