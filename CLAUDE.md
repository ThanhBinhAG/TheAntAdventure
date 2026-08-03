# Claude / AI instructions — The Ant Adventures

Project context and rules for AI assistants in this repo.

## Changelog (required)

On every task that introduces **notable changes**, update [`Personal/CHANGELOG.md`](Personal/CHANGELOG.md) before finishing:

1. Insert a new section at the top with timestamp `YYYY-MM-DD HH:mm (UTC+7)`.
2. Use subsections: `### Added`, `### Changed`, `### Fixed`, `### Removed`.
3. List concrete changes with file paths or components, matching the tone and format of prior entries.

**Required** for features, bug fixes, behavior changes, migrations, and meaningful refactors. **Optional** for purely cosmetic edits (spelling, whitespace) with no functional effect.

If you changed code but did not update the changelog, the task is incomplete.

## Prefer existing, free, project-fit libraries

When answering questions or implementing tasks:

1. **Check what's already here** — Inspect `package.json`, existing modules, and project infrastructure (e.g. Supabase) before proposing new tools.
2. **Reuse first** — Prefer dependencies already installed and patterns already used in the codebase over adding new packages.
3. **Free by default** — Do not recommend or integrate paid APIs, SaaS tiers, or proprietary SDKs unless the user explicitly asks or no viable free in-stack alternative exists.
4. **Fit the stack** — Favor solutions aligned with this project: Next.js 14, React 18, Supabase, TypeScript, Chart.js, Zod, Zustand.
5. **Justify new deps** — If a new library is truly needed, briefly explain why existing options are insufficient before adding it.

When multiple approaches work, pick the one that adds the least cost, the fewest new dependencies, and the smallest diff while meeting the requirement.
