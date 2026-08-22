# app/api/auth/ — Agent overview

## Role
Auth API: session login/logout and user listing (Supabase + break-glass).

## Contents
- Route handlers under this folder (login, logout, users)

## Boundaries
- Rate limiting and session helpers live in `lib/auth`.
- Login depends on the durable PostgreSQL CRM session store, not Redis availability.
