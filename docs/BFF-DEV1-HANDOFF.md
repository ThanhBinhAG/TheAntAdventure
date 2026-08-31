# Dev 1 BFF platform handoff

## Stable server contracts for Dev 2

| Need | Use | Contract |
| --- | --- | --- |
| Identity | `getAuthContext()` | Returns identity only; never a Supabase token. `authenticationUnavailable` means return `503`, not `401`. |
| Permission | `checkPermissionForRequest(code, { auth, getSupabaseClient })` | Returns `allowed`, or a `401`/`403` result. |
| User data | `getServerSupabaseClient(auth)` | Server-only, user-scoped client created from the verified CRM session. |
| System data | `getAdminSupabaseClient()` | Server-only service-role client; caller must perform explicit permission/object checks first. |
| API shell | `bffRoute(options, handler)` | Standard auth, permission, validation, safe structured logging, and `X-Request-ID`. |

Domain routes should use `bffRoute`; it turns unavailable auth/JWKS/Supabase verification into a retryable `503`, unauthenticated requests into `401`, and denied permissions into `403`. Domain routes must not import browser Supabase clients, return a token, create DTO/domain dependencies in Dev 1 modules, or use an admin client for user-scoped reads.

## Final acceptance ownership

Run `npm run final:acceptance` for lint, typecheck, unit tests, build, and hard browser-leakage scan. Run `FINAL_ACCEPTANCE_E2E=1 npm run final:acceptance` only with the isolated mutable Supabase test target. Browser bundle leakage gate passes as of 2026-08-31 (`npm run leakage:check` on `.next/static`). Operations must apply the session migration and prove the private-network deploy/runbook gates.
