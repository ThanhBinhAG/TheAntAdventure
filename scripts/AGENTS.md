# scripts/ — Agent overview

## Role
Ops shell helpers (not npm package scripts). Separate from `Personal/scripts` one-offs.

## Contents
- `cron-refresh-weather.sh` — weather cache refresh (loads `.env.local` for `APP_URL` / `WEATHER_CRON_SECRET`)
- `setup-pdf-deps-wsl.sh` — WSL PDF dependency setup
- `supabase-db.sh` — Supabase CLI wrapper (`db:push`, `db:bootstrap`, …)
- `docker-with-env.sh` — resolve env then compose `print|build|up|deploy|down|status` (CI uses print → build → deploy)
- `scan-leakage.sh` — fails a build when browser assets contain Supabase URLs, anon keys, or service paths
- `cleanup-crm-sessions.mjs` — host-scheduled expiry/revocation cleanup via the service-role-only database RPC
- `npm run redis:up` / `redis:down` — start/stop Compose `redis` only (`127.0.0.1:6379`) for `npm run dev`; do not start the CRM container

## Boundaries
- App domain logic stays in `lib/`. Legacy migrate tools: `Personal/scripts`.
