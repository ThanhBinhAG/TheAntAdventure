# app/api/ — Agent overview

## Role
Next.js Route Handlers for server-side auth, media, exports, weather, and diagnostics.

## Contents
- `auth/` — login, logout, users
- `branding/` — company logo
- `photos/` — gallery upload/delete
- `pricing/` — pricing PDF export
- `proposals/` — proposal PDF export
- `weather/` — weekly forecast + refresh
- `system/` — diagnostics and logs
- `health/` — health check

## Boundaries
- Call into `lib/*` for domain logic; keep handlers thin.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
