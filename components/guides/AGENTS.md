# components/guides/ — Agent overview

## Role
Guide roster + calendar scheduling UI.

## Contents
- `GuidesPage.tsx` — roster/bios/calendar tabs
- `GuideCalendar.tsx` — calendar grid (BFF `cal_events`)

## Boundaries
- Page shell in `components/pages`; roster via `/api/guides`, calendar via `/api/cal-events`.
