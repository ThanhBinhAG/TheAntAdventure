# lib/proposals/layouts/ — Agent overview

## Role
Built-in proposal **layout** renderers with distinct visual identities (Classic / Modern / Compact). Compose shared section builders from `proposal-html-sections.ts` plus layout-specific covers, programme, and pricing.

## Contents
- `layout-tokens.ts` — accent / font / surface / table-header tokens → `--pl-*` CSS vars (never overwrite `--p-brand*`)
- `classic.ts` — corporate report (tables, sidebar photos)
- `modern.ts` — editorial hero + zig-zag day imagery + inclusion cards (single pine tonal palette)
- `compact.ts` — executive brief header + striped programme table
- `index.ts` — `buildLayoutBody`, `layoutExtraStyles`

## Boundaries
- Layout = page structure/styling only; commercial copy stays in `proposal-content-overrides` / company template.
- Font stacks must work with `fonts-liberation` (Docker / WSL PDF deps) — no web fonts.
- Do not add DB-backed layouts here without extending `proposal_templates` separately.
