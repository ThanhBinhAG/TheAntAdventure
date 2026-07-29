# app/(crm)/ — Agent overview

## Role
Invisible route group that wraps authenticated CRM pages with Sidebar, Topbar, store provider, and AI copilot.

## Contents
- `[page]/` — Catch-all CRM UI mapped from slug → page component
- `layout.tsx` — CRM chrome

## Boundaries
- URL paths do not include `(crm)`. Login and system/debug stay outside this group.
