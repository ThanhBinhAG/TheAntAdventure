# CRM durable session operation

## Decision

Browser authentication is a CRM-owned opaque session. Supabase Auth still issues ES256 access JWTs and exposes its public JWKS; the BFF verifies a server-held access token locally and uses it for user-scoped RLS/RPC calls.

Login creates a random `crm_session` cookie with `HttpOnly`, `Secure` in production, and `SameSite=Lax`. The database stores only its SHA-256 hash; Supabase access and refresh tokens are AES-GCM ciphertext using `SESSION_ENCRYPTION_KEY`. No Supabase credential is returned in JSON, written to browser storage, or logged.

The page Proxy asks the internal CRM session-status route to validate an opaque cookie; it neither creates nor refreshes Supabase cookies. `POST /api/auth/refresh` reads the encrypted refresh token server-side and atomically updates stored credentials; it requires a same-origin request and has a Redis-backed, per-IP rate limit with in-process fallback.

Each `bffRoute` verifies the JWT and active-profile state once, then shares one user-scoped Supabase client with the permission check and handler/repository.

## Authorization and revocation

- Supabase validates identity and rotates refresh tokens; the CRM durable-store update is atomic with respect to its opaque session token.
- CRM permissions remain in the existing role/RPC model. The shared permission-cache version is invalidated after every role, permission, or account-status change.
- `profiles.authz_version` is incremented by database triggers whenever user role, role permissions, or `is_active` changes.
- Disabling a user bans its Supabase Auth account and revokes every active CRM durable session. It cannot refresh or sign in again.
- Auth security events are written server-side to `auth_security_events` with a SHA-256 IP hash only.

## Operations

1. Supabase must expose an asymmetric JWKS endpoint at `/auth/v1/.well-known/jwks.json`; local validation currently confirms ES256.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only for Admin operations and audit logging. It is unrelated to browser-session signing.
3. Monitor JWKS verification errors, refresh rate-limit responses, refresh failures, and `auth_security_events`.
4. Deployment adds `SESSION_ENCRYPTION_KEY` once. Rotating it invalidates active durable sessions, so perform that only as an intentional security response.
5. The Phase 2 database migration revokes obsolete pre-cutover rows. Users sign in once again through Supabase Auth and receive a new opaque CRM cookie.
6. Schedule `npm run session:cleanup` once daily on the application host (for example, `15 3 * * *`). It calls `cleanup_crm_sessions` independently of login traffic. This is a daily job, not a weekly one: `CRM_SESSION_RETENTION_DAYS` controls how long expired/revoked rows are retained (default: 30; set it to `7` only if the approved retention policy is seven days).
