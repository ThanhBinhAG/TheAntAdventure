# lib/supabase/ — Agent overview

## Role
Server-only Supabase client and session helpers for API routes and [`proxy.ts`](../../proxy.ts). No browser client.

## Contents
- `server.ts` — service-role / server Supabase client for repositories
- `middleware.ts` — `updateSession` used by root `proxy.ts` (chunk upload and self-authorizing Products APIs skip duplicate proxy Auth)
- `tls-config.ts` — development-only TLS escape hatch (no undici; safe for proxy)
- `insecure-fetch.ts` — Node/`server-only` undici Agent for an explicitly opted-in local self-signed Supabase

## Boundaries
- Browser `createBrowserClient` removed (D2.13). CRM UI reads/writes via `/api/*` only.
- Root request interception: [`proxy.ts`](../../proxy.ts) (Node runtime). Helper logic stays in `middleware.ts`.
- Proxy/session code must import `tls-config` only — never `insecure-fetch` (undici uses `node:`).
