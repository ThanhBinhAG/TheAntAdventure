# components/dev-notes/ — Agent overview

## Role
Dev Notes requirement tracking UI.

## Contents
- `DevNotesPage.tsx` — create notes, filter list, status updates, edit/delete
- `DevNoteEditModal.tsx` — edit form modal

## Boundaries
- Data via `useDevNotesPage` and `/api/dev-notes`; no browser Supabase.
