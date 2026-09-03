# components/planner/ — Agent overview

## Role
Daily Planner UI: week calendar, today's task board, completed archive.

## Contents
- `PlannerPage.tsx` — page root (load, mutations, layout)
- `TaskModal.tsx` — view/edit task pop-up (click outside to close)
- `TodayTaskRow.tsx` — today's task row actions
- `TaskExpandableText.tsx` — collapse long notes; can open modal via Show more
- `TaskStatusSelect.tsx` — shared status dropdown
- `CompletedTasksPanel.tsx` — completed tasks filter/search panel

## Boundaries
- Task status/filters/helpers: `lib/planner`.
- HTTP: `app/api/planner` (BFF). Do not write `tasks` from the browser via Supabase.
