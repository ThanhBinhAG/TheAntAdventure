# app/api/auth/refresh — Agent overview

## Role
Rotates credentials held by the CRM durable session.

## Contents
- `route.ts` — POST validates the trusted origin, refreshes Supabase credentials server-side, then atomically updates the durable session record.

## Boundaries
- Browser receives only the opaque HttpOnly `crm_session` cookie; never return credentials in JSON.
- Use `crm_sessions` only through the server repository; profile-state and RLS remain authorization boundaries.
