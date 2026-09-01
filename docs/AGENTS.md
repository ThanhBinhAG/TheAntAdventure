# docs/ — Agent overview

## Role
Tracked product documentation: database schema reference and Supabase setup. Source of truth for contributors (unlike gitignored `Personal/`).

## Contents
- `DATABASE.md` — ER / table design
- `CURRENT-SYSTEM.md` — current CRM, Supabase, Redis, and deployment boundary map
- `BFF-REFACTOR-PLAN.md` — target private-Supabase BFF architecture and implementation plan
- `BFF-TASKS.md` — ordered implementation backlog for the BFF migration
- `BFF-TASKS-vi.md` — Vietnamese two-developer BFF implementation backlog
- `BFF-TASK.md` — verified final-cutover checklist covering source, tests, browser leakage, sessions, and production networking
- `BFF-D2.12-MUTATION-AUDIT.md` — D2.12 cross-domain mutation inventory and PASS summary (2026-08-31)
- `BFF-D2.13-REMOVAL-PLAN.md` — phased plan to remove browser hydrate/auto-sync stack (D2.13)
- `BFF-D2.14-ASSET-URL-PLAN.md` — CRM-origin asset URL audit and implementation plan (D2.14)
- `BFF-DEV1-PHASE-0-BASELINE.md` — recorded Dev 1 verification, leakage, session, and ownership baseline before cutover work
- `BFF-DEV1-HANDOFF.md` — stable platform-auth contract, final gate, and ownership boundary for Dev 2
- `GRAPHRAG-MEMORY.md` — verified codebase retrieval and flow map
- `SUPABASE-SETUP.md` — install & connect steps
- `SESSION-AVAILABILITY.md` — CRM session durability and Redis outage operating decision
- `LOGGING.md` — Pino logging contract and operational boundary
- `runbooks/PRIVATE-NETWORK-CUTOVER.md` — production private-network, rollback, recovery, and key-rotation operator procedure
- `DEV-A-MIGRATION-REVIEW-2026-08-21.md` — consolidated Dev A implementation, acceptance, build, and remaining-cutover report
- `UI-UX-REDESIGN-PLAN-vi.md` — approved-design contract, two-developer backlog, migration boundaries, and acceptance plan for the travel CRM UI/UX redesign

## Boundaries
- Do not move these into `Personal/`. Owner-only notes stay under `Personal/`.
