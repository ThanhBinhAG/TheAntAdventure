# app/api/auth/ — Agent overview

## Role
Auth API: CRM-owned durable-session login/logout/refresh and user listing (Supabase + break-glass).

## Contents
- Route handlers under this folder (login, logout, refresh, users)

## Boundaries
- Rate limiting and session helpers live in `lib/auth`.
- Login stores Supabase-issued credentials encrypted in the server-side durable session store; browser receives only the opaque HttpOnly `crm_session` cookie.
- `refresh/` rotates encrypted server credentials with Origin checks and rate limiting, without returning credentials to the browser.
