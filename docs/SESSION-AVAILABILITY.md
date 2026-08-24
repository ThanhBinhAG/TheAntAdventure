# CRM Session Availability

## Decision

CRM refresh sessions are stored in PostgreSQL table `crm_sessions`; PostgreSQL is the source of truth for creation, refresh updates, and revocation. Session payloads are AES-256-GCM ciphertext using `CRM_SESSION_SECRET`. The browser always receives the signed opaque `crm_session` refresh cookie.

During the access-token rollout, deployments that set `CRM_ACCESS_TOKEN_SECRET` additionally issue two short-lived (10-minute) HttpOnly cookies: `crm_access` (HS256 JWT) and `crm_supabase_access` (the paired Supabase token). The CRM JWT stores only identity/session claims and a hash binding to the paired Supabase token; it never embeds the Supabase token. A valid access JWT avoids a PostgreSQL `crm_sessions` read on normal BFF requests. The durable session remains the fallback when Redis is unavailable or the access JWT is absent/expired.

`bffRoute` creates one request-local authentication context and a lazy user-scoped Supabase client. Permission-cache misses and the route handler share that client; permission-cache hits do not create it before authorization succeeds.

Redis is optional. It stores short-lived revoke tombstones (`crm:session:revoked:<sid>`) to reject a revoked cookie faster, but no valid session or Supabase token is stored in Redis.

## Expected Behavior

| Dependency state | Existing session | New login | Logout/revoke |
| --- | --- | --- | --- |
| Redis unavailable, PostgreSQL healthy | Falls back to durable validation | Succeeds | Durable revoke succeeds; Redis tombstone is skipped |
| PostgreSQL unavailable | Rejected safely | Returns 503 | Cookie is cleared by the client response; durable revoke cannot be confirmed |
| PostgreSQL healthy, session revoked/expired | Rejected | N/A | Idempotent |

## Owner-Ops Handoff

- Provide `SUPABASE_SERVICE_ROLE_KEY` only to the server runtime; never expose it through `NEXT_PUBLIC_*` variables or browser bundles.
- Operate PostgreSQL with backups, point-in-time recovery where available, and HA appropriate to CRM availability targets.
- Monitor database errors/latency for `crm_sessions`, session creation failures, and growth of expired/revoked rows. Purge expired or revoked rows through an approved maintenance job after the audit-retention period.
- Keep Redis private, authenticated, and fail-fast. Redis health may affect revoke acceleration only, never login or session validation.

## Deployment

1. Apply migration `20260821113000_add_durable_crm_sessions.sql` to every active database.
2. Configure `CRM_SESSION_SECRET` (at least 32 characters) and `SUPABASE_SERVICE_ROLE_KEY` in the server environment.
3. For the opt-in JWT rollout, configure a separate `CRM_ACCESS_TOKEN_SECRET` (at least 32 characters) on every application instance before deploying the new code.
4. Deploy application code, then test login creates `crm_access`/`crm_supabase_access`, authenticated BFF requests, `POST /api/auth/refresh`, logout, and Redis-down fallback.
