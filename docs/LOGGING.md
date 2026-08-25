# Logging

Server code emits newline-delimited JSON through Pino to stdout; the container platform owns collection and retention.

- `lib/system/server-logger.ts` — server-only Pino root logger, redaction, and request IDs.
- `lib/system/client-logger.ts` — development-only browser diagnostics; never use it for operational events.
- Standard fields: `scope`, `event`, `requestId`, `actorId`, `resourceId`, `durationMs`, and `statusCode`.
- Do not log request bodies, credentials, cookies, personal data, or user-controlled field names.
- Reuse the Supabase audit trails for authentication and access-control changes; stdout logs are not the audit record.
- Set `LOG_LEVEL` to `info` in production; temporarily use `debug` only while investigating an incident.
- Use a child request logger for server routes so every related entry has the same `requestId`.

## Boundaries

Pino remains server-only. Add log collection, retention, RBAC, and alerting in deployment infrastructure, not on the request path.
