# Logging

Server code emits newline-delimited JSON through Pino to stdout; the container platform owns collection and retention.

- `lib/system/server-logger.ts` — server-only Pino root logger, redaction, request IDs, and the HTTP completion contract.
- `lib/system/client-logger.ts` — development-only browser diagnostics; never use it for operational events.
- Every API response must emit exactly one `http.request.completed` event through `createHttpRequestLogger`. It binds `scope`, `requestId`, `route`, and `method`; completion adds `statusCode` and `durationMs`.
- Direct API routes use `withHttpRequestLogging({ scope, route }, handler)`. The wrapper creates the request logger before the handler, completes every returned response once, and exposes its contextual child logger for safe domain failure events.
- BFF routes use `bffRoute` and must provide static `logging: { scope, route }` metadata. The wrapper completes successful, authentication, permission, validation, redirect, and exception responses once, sets `X-Request-Id`, and adds the authenticated `actorId` only after authentication succeeds.
- `POST /api/auth/login` records Pino events for accepted and rejected attempts: `auth.login.succeeded` includes only the method and validated `actorId` when available; `auth.login.rejected` includes only a stable reason and status. It never records the login identity, password, CAPTCHA token, IP address, cookies, or a raw upstream error message.
- Add `actorId` only when authentication is known, and `resourceId` only for a validated internal ID or business code. Never use an email, a display name, a request value, or a token for either field.
- Completion level is automatic: `2xx`/`3xx` is `info`, `4xx` is `warn`, and `5xx` is `error`. A successful health check is `debug`; a failing health check remains `error`.
- Do not log request bodies, credentials, cookies, personal data, or user-controlled field names.
- Error fields are allowlisted to safe `type` and `code`; raw error messages, stacks, causes, and custom properties are never logged.
- Reuse the Supabase audit trails for authentication and access-control changes; stdout logs are not the audit record.
- Set `LOG_LEVEL` to `info` in production; temporarily use `debug` only while investigating an incident.
- Use the returned child logger for related server events so they share the same request context.
- Sensitive routes emit stable, searchable domain events under `auth.`, `access_control.`, `gallery.`, `branding.`, `dashboard.`, `sidebar.`, or `weather.`. Record outcome/status and safe error identifiers only; never attach request bodies, user-entered queries, email addresses, cookies, or media paths.
- Redis cache failures use stable `redis.cache.*_failed` / `redis.connection.failed` events with an infrastructure scope. Do not log Redis keys, patterns, values, URLs, or credentials. Dashboard and product-cache invalidation failures use their own domain events and preserve cache fallback behavior.
- `debug-logger` retains its bounded in-memory diagnostic buffer; its optional stdout signal is Pino `debug` (`system.debug.emitted`) with a fixed message and no debug payload. `client-logger` remains browser-only and development-only.

## Event catalog

Every API route emits `http.request.completed`; filter it by the stable `scope`, `route`, `method`, `statusCode`, and `requestId` fields. Domain events add the operational reason for an important outcome, but are not a replacement for the completion event.

| Domain | Event names | Safe fields / intent |
| --- | --- | --- |
| HTTP | `http.request.completed` | Required completion event; status and duration for all 75 API routes. |
| Auth | `auth.login.*`, `auth.logout.*`, `auth.refresh_unavailable` | Authentication outcome, stable reason/status, and a validated `actorId` only after it is known. |
| Access control | `access_control.*permission_denied`, `access_control.*role_*`, `access_control.*permission_*`, `access_control.*user_*` | Authorization denial and privileged mutation outcomes; audit trail remains the source of record. |
| Gallery / branding | `gallery.*`, `branding.*` | Upload, delete, folder, and logo outcomes; use an internal resource ID only, never a storage path. |
| Product / BFF | `bff.request.failed`, `products.*`, `pricing.*`, `proposal.*` | BFF failure and catalog/export outcomes; static route metadata makes aggregation safe. |
| Dashboard / weather | `dashboard.*`, `sidebar.*`, `weather.*` | Read/cache/refresh outcomes without user-entered filters or destination text. |
| Infrastructure | `redis.cache.*_failed`, `redis.connection.failed`, `dashboard.cache.invalidate_failed` | Cache/connection failure identifiers only; never Redis keys, patterns, URLs, values, or credentials. |
| Diagnostics | `system.debug.emitted` | Fixed, debug-only Pino message; the debug endpoint still never writes client payload to stdout. |

## Rollout and rollback

1. Deploy to staging with `LOG_LEVEL=info`, exercise login, one BFF read/write, one upload, and a weather request, then verify one `http.request.completed` record per request by `requestId` and the returned `X-Request-Id`.
2. Compare staging log volume grouped by `event=http.request.completed`, `scope`, `route`, and `statusCode`. Confirm 4xx records are warnings, 5xx records are errors, and no body, cookie, token, email, or raw error message is present.
3. Roll out production in three monitored waves: BFF; auth/write/upload; then high-volume reads and weather. Pause a wave if its error rate or log volume materially exceeds the staging baseline.
4. To reduce non-error noise during an incident, set `LOG_LEVEL=warn` and redeploy/restart the workload. This retains warning/error evidence while suppressing normal `info` completions. Revert the logging release and redeploy if the issue persists.

## Boundaries

Pino remains server-only. Add log collection, retention, RBAC, and alerting in deployment infrastructure, not on the request path.
