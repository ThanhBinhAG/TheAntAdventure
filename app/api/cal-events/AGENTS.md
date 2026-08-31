# app/api/cal-events/ — Agent overview

## Role
Permissioned CRM BFF endpoints for guide calendar events.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `DELETE` remove event

## Boundaries
- Delegate to `lib/cal-events/cal-events-repository`.
- Auth via `bffRoute` (`guides.read` / `guides.write`).
