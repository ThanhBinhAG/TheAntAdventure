# CRM Session Availability

## Decision

CRM sessions are stored in PostgreSQL table `crm_sessions`; PostgreSQL is the source of truth for creation, validation, refresh updates, and revocation. Session payloads are AES-256-GCM ciphertext using `CRM_SESSION_SECRET`. The browser only receives the signed opaque `crm_session` cookie.

Redis is optional. It stores short-lived revoke tombstones (`crm:session:revoked:<sid>`) to reject a revoked cookie faster, but no valid session or Supabase token is stored in Redis.

## Expected Behavior

| Dependency state | Existing session | New login | Logout/revoke |
| --- | --- | --- | --- |
| Redis unavailable, PostgreSQL healthy | Continues normally | Succeeds | Durable revoke succeeds; Redis tombstone is skipped |
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
3. Deploy application code, then test login, authenticated request, logout, and Redis-down behavior.
