# lib/tour-design/ — Agent overview

## Role
Tour brief/draft/itinerary/outline workflow, pricing lookups, and design gates.

## Contents
- `tour-design-types.ts`, `tour-draft-utils.ts`, `tour-itinerary.ts`, `tour-outline-workflow.ts`, `tour-pricing.ts`, `tour-design-gate.ts`, …
- `tour-durations.ts` — Client Brief duration presets (2–30) + custom free text
- `tour-draft-utils.ts` also persists proposal export state in `brief_json`: `__proposalTemplateOverrides` (per-quote), `__proposalSpecialNotes`, `__proposalHotelRates`, `__proposalLayoutId`. Company-wide copy is `proposal_templates`, not the draft.

## Boundaries
- Outline HTML/print: `lib/outline`. Proposal docs: `lib/proposals`. UI: `components/tour-design` (URL slug `tourdesign`).
