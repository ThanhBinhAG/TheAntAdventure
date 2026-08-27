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
- `BFF-DEV1-PHASE-0-BASELINE.md` — recorded Dev 1 verification, leakage, session, and ownership baseline before cutover work
- `GRAPHRAG-MEMORY.md` — verified codebase retrieval and flow map
- `SUPABASE-SETUP.md` — install & connect steps
- `SESSION-AVAILABILITY.md` — CRM session durability and Redis outage operating decision
- `LOGGING.md` — Pino logging contract and operational boundary
- `DEV-A-MIGRATION-REVIEW-2026-08-21.md` — consolidated Dev A implementation, acceptance, build, and remaining-cutover report

## Boundaries
- Do not move these into `Personal/`. Owner-only notes stay under `Personal/`.
