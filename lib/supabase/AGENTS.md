# lib/supabase/ — Agent overview

## Role
Browser Supabase client factory and Next middleware helpers.

## Contents
- `client.ts`, `index.ts`, `middleware.ts` (chunk upload skips Auth RTT when session cookies present)
- `tls-config.ts` — Edge-safe TLS insecure flags (no undici)
- `insecure-fetch.ts` — Node/`server-only` undici Agent for company Supabase TLS

## Boundaries
- Hydrate/push: `lib/db`. React sync context: `lib/context`.
- Middleware must import `tls-config` only — never `insecure-fetch` (breaks Edge with `node:` scheme).
- Do not use insecure fetch in browser `client.ts`.
