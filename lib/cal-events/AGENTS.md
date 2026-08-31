# lib/cal-events/ — Agent overview

## Role
Guide calendar (`cal_events`) Zod/DTO/ids and server-only repository.

## Contents
- `cal-events-input.ts` — Zod create + `CalEventListItem` DTO
- `cal-events-ids.ts` — `nextCalEventId` (`CE-NNN`)
- `cal-events-repository.ts` — server-only list/get/create/delete

## Boundaries
- Calendar UI lives under `components/guides`; validate `guideId` exists before insert.
- Do not return raw Supabase rows.
