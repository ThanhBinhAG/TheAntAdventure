# lib/supabase/ — Agent overview

## Role
Browser Supabase client factory and session helpers for [`proxy.ts`](../../proxy.ts).

## Contents
- `client.ts`, `index.ts`, `middleware.ts` — `updateSession` used by root `proxy.ts` (chunk upload and self-authorizing Products APIs skip duplicate proxy Auth)
- `tls-config.ts` — development-only TLS escape hatch (no undici; safe for proxy)
- `insecure-fetch.ts` — Node/`server-only` undici Agent for an explicitly opted-in local self-signed Supabase

## Boundaries
- Hydrate/push: `lib/db`. React sync context: `lib/context`.
- Root request interception: [`proxy.ts`](../../proxy.ts) (Node runtime). Helper logic stays in `middleware.ts` — do not rename the helper file to avoid churn.
- Proxy/session code must import `tls-config` only — never `insecure-fetch` (undici uses `node:`).
- Do not use insecure fetch in browser `client.ts`.
