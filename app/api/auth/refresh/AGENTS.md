# app/api/auth/refresh — Agent overview

## Role
Maintains the Supabase SSR cookie session and mirrored short-lived access JWT.

## Contents
- `route.ts` — POST validates the trusted origin, refreshes Supabase credentials only near expiry, then updates the access mirror cookie.

## Boundaries
- Keep access and refresh credentials in HttpOnly Supabase SSR cookies; never return tokens in JSON.
- Do not restore the retired `crm_sessions` implementation; profile-state and RLS remain the authorization boundaries.
