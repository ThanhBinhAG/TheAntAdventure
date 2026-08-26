# components/auth/ — Agent overview

## Role
Auth-related widgets (Turnstile captcha and Supabase session refresh).

## Contents
- `TurnstileWidget.tsx` — login CAPTCHA.
- `SupabaseSessionRefresher.tsx` — refreshes HttpOnly Supabase credentials while authenticated CRM is open.

## Boundaries
- Session/rate-limit: `lib/auth`. Login page: `app/login`.
