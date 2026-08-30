# components/post-tour/ — Agent overview

## Role
Post-tour feedback UI: log, client survey, ops debrief, guide report, agent feedback.

## Contents
- `PostTourPage.tsx` — main page (tabs, forms, feedback log)

## Boundaries
- Data via `useFeedbackPage` / `useCreateFeedback` and `/api/feedback`; booking picker via `useEnsureBookingsCatalogLoaded`.
- Do not call browser Supabase or Zustand auto-sync for feedback writes.
