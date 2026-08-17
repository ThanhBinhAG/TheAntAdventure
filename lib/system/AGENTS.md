# lib/system/ — Agent overview

## Role
Health, diagnostics, and app/debug logging.

## Contents
- `health.ts` — `/api/health` readiness (Supabase Auth + process memory)
- `process-memory.ts` — V8/process heap snapshot + rate-limited Sentry heap-pressure warning
- `semaphore.ts` — shared FIFO semaphore (Sharp + PDF)
- `pdf-concurrency.ts` — `pdfBrowserGate` (max 1 Chromium PDF at a time)
- `run-diagnostics.ts`, `app-logger.ts`, `debug-*.ts`

## Boundaries
- UI: `components/system`. APIs: `app/api/system`, `app/api/health`.
- Memory pressure: `heapUsedRatio ≥ 0.85` → health `degraded` (HTTP 503) + Sentry warn ≤1/5min.
