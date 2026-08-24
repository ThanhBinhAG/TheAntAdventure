# Supabase Auth session operation

## Decision

CRM does not sign or encrypt its own browser session. Supabase Auth issues ES256 access JWTs and exposes its public JWKS; BFF verifies the JWT locally and uses it for user-scoped RLS/RPC calls.

Login and refresh use `@supabase/ssr` cookies with `HttpOnly`, `Secure` in production, and `SameSite=Lax`. A small HttpOnly `sb-crm-access-token` mirror lets BFF verify the Supabase JWT without decoding the refresh cookie. No credential is returned in JSON, written to `localStorage`, or logged.

The page proxy refreshes Supabase SSR cookies on navigation. `POST /api/auth/refresh` keeps an open CRM page current; it requires a same-origin request and has a Redis-backed, per-IP rate limit with in-process fallback.

Each `bffRoute` verifies the JWT and active-profile state once, then shares one user-scoped Supabase client with the permission check and handler/repository.

## Authorization and revocation

- Supabase validates identity and rotates refresh tokens.
- CRM permissions remain in the existing role/RPC model. The shared permission-cache version is invalidated after every role, permission, or account-status change.
- `profiles.authz_version` is incremented by database triggers whenever user role, role permissions, or `is_active` changes.
- Disabling a user bans its Supabase Auth account; it cannot refresh or sign in again. Existing short-lived JWTs lose CRM permissions after cache invalidation.
- Auth security events are written server-side to `auth_security_events` with a SHA-256 IP hash only.

## Operations

1. Supabase must expose an asymmetric JWKS endpoint at `/auth/v1/.well-known/jwks.json`; local validation currently confirms ES256.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only for Admin operations and audit logging. It is unrelated to browser-session signing.
3. Monitor JWKS verification errors, refresh rate-limit responses, refresh failures, and `auth_security_events`.
4. Deployment of this cutover clears old `crm_session` cookies. Users with legacy sessions sign in once again through Supabase Auth.

The retired `crm_sessions` table is retained temporarily for data-retention cleanup only; the application no longer reads or writes it. Do not drop it until the agreed retention window has passed.
