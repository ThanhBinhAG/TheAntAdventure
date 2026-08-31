# lib/dev-notes/ — Agent overview

## Role
Dev Notes Zod/DTO/ids and server-only repository for the `dev_notes` table.

## Contents
- `dev-notes-input.ts` — Zod create/update + `DevNoteListItem` DTO
- `dev-notes-ids.ts` — `nextDevNoteId` (`DN-NNN`)
- `dev-notes-repository.ts` — server-only list/get/create/update

## Boundaries
- Page UI lives under `components/dev-notes`; keep persistence in the repository.
- Do not return raw Supabase rows.
