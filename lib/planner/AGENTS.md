# lib/planner/ — Agent overview

## Role
Planner task status labels, rollover, and filters.

## Contents
- `planner-task-utils.ts` — status labels, rollover, filters, text collapse helpers
- `task-repository.ts` — Server-only repository for Supabase CRUD on tasks.

## Boundaries
- UI: `components/planner` + planner page.
