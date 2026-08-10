# Agent instructions — The Ant Adventures

Guidance for AI agents working in this repository.

## Nested AGENTS (required)

Every meaningful code/docs folder has an `AGENTS.md` describing **what that folder owns**.

1. When working under a path, read the **nearest** `AGENTS.md` (and its parent if needed) before editing.
2. When you **create a new folder**, add an `AGENTS.md` in the same change (short Role + Contents + Boundaries).
3. Keep leaf files short (5–15 lines). Put the folder map on the parent; do not paste the whole repo architecture into every leaf.
4. Skip only generated dirs: `node_modules`, `.next`, `.git`.

### Top-level map

| Path | Role |
|------|------|
| [`app/`](app/AGENTS.md) | Next.js App Router — CRM shell, login, API routes |
| [`components/`](components/AGENTS.md) | React UI — page shells, domain widgets, chrome |
| [`lib/`](lib/AGENTS.md) | Domain logic, store helpers, Supabase sync, seeds |
| [`hooks/`](hooks/AGENTS.md) | Shared React hooks |
| [`env/`](env/AGENTS.md) | Committed company Supabase defaults + startup sanitize |
| [`docs/`](docs/AGENTS.md) | Tracked product docs (schema, setup) |
| [`scripts/`](scripts/AGENTS.md) | Ops shell helpers (weather cron, PDF deps) |
| [`supabase/`](supabase/AGENTS.md) | PostgreSQL schema, seeds, migrations |
| [`tests/`](tests/AGENTS.md) | Vitest / Node test suite |
| [`Personal/`](Personal/AGENTS.md) | Gitignored local notes, changelog, legacy |
| [`.cursor/`](.cursor/AGENTS.md) | Cursor rules for this repo |
| [`Dockerfile`](Dockerfile) / [`docker-compose.yml`](docker-compose.yml) | Production image (standalone) + local/VM compose |

Template for new folders:

```markdown
# <path> — Agent overview

## Role
1–3 sentences: what this folder owns.

## Contents
- `child/` or `file.ts` — one line each

## Boundaries
- Do / do not (cross-imports, side effects)
```

## Changelog (required)

Whenever you make **notable code or project changes** (features, fixes, refactors, config, docs that affect behavior), you **must** update [`Personal/CHANGELOG.md`](Personal/CHANGELOG.md) in the **same session** as the change.

- Add a new dated section at the top (below the format note), using `YYYY-MM-DD HH:mm (UTC+7)`.
- Group bullets under `### Added`, `### Changed`, `### Fixed`, or `### Removed` as appropriate.
- Describe **what** changed and **where** (file paths or modules), in the same style as existing entries.
- Skip changelog updates only for trivial edits with no user-visible or behavioral impact (typos, formatting-only, comments-only).

Do not consider a task complete until the changelog reflects the work.

## Prefer existing, free, project-fit libraries

When answering questions or implementing tasks:

1. **Check what's already here** — Inspect `package.json`, existing modules, and project infrastructure (e.g. Supabase) before proposing new tools.
2. **Reuse first** — Prefer dependencies already installed and patterns already used in the codebase over adding new packages.
3. **Free by default** — Do not recommend or integrate paid APIs, SaaS tiers, or proprietary SDKs unless the user explicitly asks or no viable free in-stack alternative exists.
4. **Fit the stack** — Favor solutions aligned with this project: Next.js 14, React 18, Supabase, TypeScript, Chart.js, Zod, Zustand.
5. **Justify new deps** — If a new library is truly needed, briefly explain why existing options are insufficient before adding it.

When multiple approaches work, pick the one that adds the least cost, the fewest new dependencies, and the smallest diff while meeting the requirement.
