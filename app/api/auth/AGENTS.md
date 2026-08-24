# app/api/auth/ — Agent overview

## Role
Auth API: session login/logout and user listing (Supabase + break-glass).

## Contents
- Route handlers under this folder (login, logout, refresh, users)

## Boundaries
- Rate limiting and session helpers live in `lib/auth`.
- Login depends on the durable PostgreSQL CRM session store, not Redis availability.
- `refresh/` renews short-lived JWT access cookies without returning credentials to the browser.
