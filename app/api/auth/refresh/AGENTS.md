# app/api/auth/refresh — Agent overview

## Role
Rotates short-lived CRM access credentials from the durable CRM refresh session.

## Contents
- `route.ts` — POST validates the durable session, refreshes Supabase credentials when necessary, then issues new access cookies.

## Boundaries
- Keep refresh credentials server-side in `crm_sessions`; never return tokens in JSON.
- Preserve the durable session as the Redis-down and revocation fallback during JWT migration.
