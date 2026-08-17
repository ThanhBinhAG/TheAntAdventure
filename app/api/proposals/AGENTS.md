# app/api/proposals/ — Agent overview

## Role
Proposal document PDF export API.

## Contents
- `export/` — proposal PDF export
- `templates/` — company B2C/B2B commercial template GET/PUT

## Boundaries
- Assembler/HTML/PDF live in `lib/proposals`. Template rows: `proposal_templates` (lazy; not page-boot).
