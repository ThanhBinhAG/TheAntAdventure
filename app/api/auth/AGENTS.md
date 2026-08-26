# app/api/auth/ — Agent overview

## Role
Auth API: Supabase SSR session login/logout/refresh and user listing (Supabase + break-glass).

## Contents
- Route handlers under this folder (login, logout, refresh, users)

## Boundaries
- Rate limiting and session helpers live in `lib/auth`.
- Login stores Supabase-issued credentials only in HttpOnly SSR cookies; CRM owns no JWT-signing secret.
- `refresh/` rotates the Supabase session with Origin checks and rate limiting, without returning credentials to the browser.
