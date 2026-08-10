# env/ — Agent overview

## Role
Committed self-hosted company Supabase defaults so VM `npm run dev` works without SSH env edits (even if leftover `.env.local` points at localhost). Source of truth for sanitize; `lib/env.ts` `PRODUCTION_DEFAULTS` mirrors these values.

## Contents
- `company.defaults.env` — URL/keys/`APP_URL`/`SUPABASE_TLS_INSECURE` for `sb.mitelai.com:9001`
- `sanitize-supabase-env.mjs` — always replace localhost/empty URL with company defaults at Next startup

## Boundaries
- Runtime resolve: [`lib/env.ts`](../lib/env.ts). TLS fetch: [`lib/supabase/insecure-fetch.ts`](../lib/supabase/insecure-fetch.ts).
- Local Docker Supabase is not used for the app — keep URL on company self-host; use `READ_ONLY` when developing against the shared DB.
- Do not add break-glass or cron secrets here unless deploy truly requires them in-repo.
