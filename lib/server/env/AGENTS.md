# lib/server/env/ — Agent overview

## Role
Typed, server-only access to runtime configuration.

## Contents
- `supabase.ts` — private Supabase endpoint, keys, issuer, and TLS settings
- `app.ts` — server runtime app URL, CAPTCHA site key, and build metadata
- `auth.ts` — cron, durable-session encryption, and break-glass credentials

## Boundaries
- Never read `NEXT_PUBLIC_*` as a fallback.
- Return trimmed values only; do not log secrets.
