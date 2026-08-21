# Browser E2E acceptance - Dev A

## Scope

`npm run test:e2e` uses Playwright Chromium against the running CRM, authenticates through `/login`, and sends BFF calls from that browser context. It creates an `admin` and an unassigned user, then verifies CRM cookie login/logout, revoked/expired sessions, `401`/`403`, Product/Pricing, Planner, Attractions, and Tour Design transaction rollback. A network audit opens all Dev A screens and fails on any HTTP(S) request outside the CRM origin. Every database assertion uses the server-only service role and the generated `E2E-<timestamp>-<pid>` prefix is removed in teardown.

## Local run

1. Start Redis and local Supabase, then apply current migrations.
2. Configure `.env.local` with the local Supabase URL, anon key, service-role key, and `CRM_SESSION_SECRET`.
3. Run `E2E_ALLOW_DATABASE_MUTATION=1 npm run test:e2e`.

The command refuses a non-local Supabase URL by default. A dedicated remote test database requires both `E2E_ALLOW_DATABASE_MUTATION=1` and `E2E_ALLOW_REMOTE_DATABASE=1`; do not set either flag for production.
