# app/login/ — Agent overview

## Role
Login page outside the CRM shell (credentials + optional Turnstile).

## Contents
- `page.tsx`, `LoginForm.tsx`

## Boundaries
- Auth widgets may use `components/auth`; session logic in `lib/auth`.
- Keep this route light: root layout must **not** wrap Ant Design (`AntdRegistry` lives in Access Control only).
- First-load timing for real users: measure with `next build && next start` (or Docker), not cold `next dev` compile times.
