# app/api/tour-design/acknowledgements — Agent overview

## Role
Acknowledges a Sales Pipeline handoff only after an authorized Tour Design mutation.

## Contents
- `route.ts` — POST validates `leadId`, requires `tour_design.write`, and delegates the idempotent update.

## Boundaries
- Use `lib/tour-design/tour-design-repository.ts`; do not write Leads from browser sync.
- The conditional database update owns pending-state and concurrency protection.
