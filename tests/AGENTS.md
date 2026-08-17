# tests/ — Agent overview

## Role
Tracked pointer only. Unit tests live in gitignored [`Personal/tests/`](../Personal/tests/) (`tsx --test`). Do not commit `*.test.ts` here or to GitLab.

## Contents
- This `AGENTS.md` — points agents at `Personal/tests/`

## Boundaries
- Prefer testing `lib/` pure functions; avoid brittle UI snapshots unless needed.
- `npm test` runs `Personal/tests` when present; no-ops if that folder is missing (clone without local archive).
