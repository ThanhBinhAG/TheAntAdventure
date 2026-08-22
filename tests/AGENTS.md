# tests/ — Agent overview

## Role
Unit tests live here (`tsx --test`).

## Contents
- `*.test.ts` — test suites for controllers, utilities, and helper modules.

## Boundaries
- Prefer testing `lib/` pure functions; avoid brittle UI snapshots unless needed.
