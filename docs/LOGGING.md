# Logging

Server code emits newline-delimited JSON through Pino to stdout; the container platform owns collection and retention.

- `lib/system/server-logger.ts` — server-only Pino root logger, redaction, request IDs, and the HTTP completion contract.
- `lib/system/client-logger.ts` — development-only browser diagnostics; never use it for operational events.
- Every API response must emit exactly one `http.request.completed` event through `createHttpRequestLogger`. It binds `scope`, `requestId`, `route`, and `method`; completion adds `statusCode` and `durationMs`.
- BFF routes use `bffRoute` and must provide static `logging: { scope, route }` metadata. The wrapper completes successful, authentication, permission, validation, redirect, and exception responses once, sets `X-Request-Id`, and adds the authenticated `actorId` only after authentication succeeds.
- `POST /api/auth/login` records Pino events for accepted and rejected attempts: `auth.login.succeeded` includes only the method and validated `actorId` when available; `auth.login.rejected` includes only a stable reason and status. It never records the login identity, password, CAPTCHA token, IP address, cookies, or a raw upstream error message.
- Add `actorId` only when authentication is known, and `resourceId` only for a validated internal ID or business code. Never use an email, a display name, a request value, or a token for either field.
- Completion level is automatic: `2xx`/`3xx` is `info`, `4xx` is `warn`, and `5xx` is `error`. A successful health check is `debug`; a failing health check remains `error`.
- Do not log request bodies, credentials, cookies, personal data, or user-controlled field names.
- Error fields are allowlisted to safe `type` and `code`; raw error messages, stacks, causes, and custom properties are never logged.
- Reuse the Supabase audit trails for authentication and access-control changes; stdout logs are not the audit record.
- Set `LOG_LEVEL` to `info` in production; temporarily use `debug` only while investigating an incident.
- Use the returned child logger for related server events so they share the same request context.

## Boundaries

Pino remains server-only. Add log collection, retention, RBAC, and alerting in deployment infrastructure, not on the request path.
