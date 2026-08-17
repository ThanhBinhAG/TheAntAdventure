# app/api/health/ — Agent overview

## Role
Liveness/readiness probe for ops and Docker healthcheck.

## Contents
- `route.ts` — `GET` → `runHealthCheck()` (Auth ping + process memory)

## Boundaries
- Logic lives in `lib/system/health` + `lib/system/process-memory`.
- HTTP 200 only when `status === 'ok'`; `degraded` / `error` → 503 (container may restart on sustained heap pressure).
