# components/auth/ — Agent overview

## Role
Auth-related widgets (Turnstile captcha and access-token refresh).

## Contents
- `TurnstileWidget.tsx` — login CAPTCHA.
- `CrmAccessRefresher.tsx` — refreshes HttpOnly CRM access credentials while authenticated CRM is open.

## Boundaries
- Session/rate-limit: `lib/auth`. Login page: `app/login`.
