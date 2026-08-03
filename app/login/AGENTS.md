# app/login/ — Agent overview

## Role
Login page outside the CRM shell (credentials + optional Turnstile).

## Contents
- `page.tsx`, `LoginForm.tsx`

## Boundaries
- Auth widgets may use `components/auth`; session logic in `lib/auth`.
