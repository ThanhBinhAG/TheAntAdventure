# Current CRM System

## Purpose

This document records the deployed CRM architecture before the BFF refactor. It is an evidence-based map of the codebase, not a target design.

## Components

| Component | Runtime responsibility | Network role |
|---|---|---|
| Browser | Renders Next.js UI, holds Zustand state, hydrates and syncs business data | Calls CRM and Supabase directly |
| CRM app | Next.js 16 application, authentication middleware, API routes, PDF/image work | Listens on port 3006 |
| Supabase | Auth, PostgREST, Storage, and PostgreSQL business data | URL is configured as `NEXT_PUBLIC_SUPABASE_URL` |
| Redis | Best-effort cache for selected server-side reads | Internal service at `redis://redis:6379` |
| Reverse proxy | Deployment concern documented for nginx; terminates TLS before CRM | Not included as a CRM Compose service |

## Current request paths

```text
Browser ──HTTPS──> CRM Next.js :3006
Browser ──HTTPS──> Supabase API / Auth / Storage :9001
CRM     ──TCP────> Redis :6379
CRM     ──HTTPS──> Supabase API / Auth / Storage :9001
```

The application Compose file includes CRM and Redis only. It does not start a Supabase stack. The CRM image receives `NEXT_PUBLIC_SUPABASE_URL` and the anon key as build arguments, which means they are embedded into the browser bundle.

## Browser-to-Supabase dependencies

`lib/supabase/client.ts` creates an `@supabase/ssr` browser client from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

`lib/db/supabase/shared.ts` uses that browser client for the CRM's generic hydrate and sync layer. It reads and writes business tables including customers, leads, bookings, guides, products, finance, staff, tasks, photos, and suppliers. Auto-sync therefore creates direct browser-to-Supabase database traffic.

The Guides page uploads avatars directly from the browser to the `photos` Storage bucket. Gallery uploads are different: their chunking and Sharp processing already use CRM API routes before the server writes to Storage.

## Authentication and authorization

- Login and logout already use CRM API routes under `app/api/auth/`.
- The Supabase SSR middleware uses Supabase Auth cookies and contacts Supabase to resolve or refresh the user.
- Access-control route handlers and server helpers enforce CRM roles and permissions for several server API paths.
- Row Level Security remains a second authorization boundary in Supabase.

This is a mixed architecture: some operations are mediated by CRM, while generic data sync and one Storage upload path are not.

## Redis already in source

`lib/redis/client.ts` is server-only and returns `null` on a connection failure, so callers must continue without cache. It uses `REDIS_URL`, defaults its connection timeout to one second, and retries a connection up to three times.

The current implemented cache is Product facets:

- Key namespace: `cache:products:facets:v1:<filter-hash>`
- TTL: five minutes
- Invalidation: scans and deletes that namespace after relevant writes
- Fallback: a Redis error must not fail the Product API request

`docker-compose.yml` runs Redis but binds it to `127.0.0.1:6379`; CRM accesses it by the Docker service name `redis`.

## Security implications

The browser currently knows the Supabase base URL and publishable/anon key, and it can send Auth, REST, and Storage requests to that URL. The service-role key is server-only, but keeping it private is insufficient for the requirement that a browser must never touch Supabase.

Hiding port `9001` behind a reverse-proxy path does not meet that requirement: the browser would still reach Supabase through that path.

## Constraints for the refactor

- Preserve existing domain mappers and sync safety rules where possible.
- Preserve RLS, but do not rely on it as the only authorization check once a server service role is used.
- Preserve server-side gallery upload processing and existing Redis graceful-degradation behavior.
- Do not expose `SUPABASE_URL`, Supabase API keys, Postgres, Studio, Storage, or Realtime to browser code or public Docker ports.
