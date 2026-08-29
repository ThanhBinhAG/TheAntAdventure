# app/api/auth/session — Agent overview

## Role
Validates the opaque CRM durable-session cookie for the Proxy and authenticated clients.

## Contents
- `route.ts` — safe session-status response; never serializes credentials.

## Boundaries
- Delegate validation to `lib/auth/session`; do not call Supabase Auth or expose session data here.
