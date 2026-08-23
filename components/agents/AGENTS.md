# components/agents/ — Agent overview

## Role
B2B Agents page and form modal UI.

## Contents
- `AgentsPage.tsx` — list/search via `useAgentPage`; create/edit/delete via register/delete hooks (BFF)
- `AgentFormModal.tsx` — add/edit form; server allocates `AGT-NNN` on create

## Boundaries
- Commission math lives in `lib/sales`; page shell in `components/pages`.
- Browser must not write `agents` via store auto-sync after BFF mutate.
