# .cursor/rules/ — Agent overview

## Role
Cursor rule files (`.mdc`) applied always or by glob.

## Contents
- `prefer-existing-libraries.mdc` — stack/reuse policy
- `nested-agents.mdc` — maintain nested `AGENTS.md` files
- `optimize-requests-and-durable-fixes.mdc` — page request budget, edge cases, durable fixes
- `thin-page-shells.mdc` — `components/pages` stay thin; domain UI elsewhere
- `extract-and-single-responsibility.mdc` — split god files; reuse pipelines
- `photo-pipeline-boundaries.mdc` — gallery / storage / image-pipeline ownership

## Boundaries
- Keep rules short and actionable; link to root `AGENTS.md` for the full map.
