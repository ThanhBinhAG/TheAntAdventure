# app/api/guides/avatar/ — Agent overview

## Role
Authenticated CRM-origin upload and delivery endpoint for Guide avatars.

## Contents
- `route.ts` — validates, stores, and proxies one guide avatar.

## Boundaries
- Validate the exact Guide storage path; never return a public Supabase URL.
- Keep `guides.read`/`guides.write`, origin, and temporary-auth-outage handling intact.
