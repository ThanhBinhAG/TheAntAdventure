# Agent instructions — The Ant Adventures

Guidance for AI agents working in this repository.

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
