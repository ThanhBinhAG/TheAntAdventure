# BFF Refactor: Private Supabase with Redis

## Goal

Make the CRM the only public application. A browser calls CRM HTTPS endpoints only; all Supabase traffic stays on a Docker-only network. Redis remains an internal, optional cache owned by CRM server code.

## Target topology

```text
Browser
  │ HTTPS :443
  ▼
Reverse proxy
  │ internal Docker network
  ▼
CRM (Next.js)
  ├── Redis                  redis://redis:6379
  └── Supabase API gateway   http://supabase-gateway:8000
        ├── Auth
        ├── REST / Storage / Realtime services
        └── PostgreSQL
```

Only the reverse proxy publishes a host port. CRM, Redis, the Supabase gateway, PostgreSQL, Studio, Storage, Auth, and Realtime use `expose` or no port declaration. They are attached to the same private Compose network.

## Security invariants

1. No `NEXT_PUBLIC_SUPABASE_*` variable exists in build arguments, runtime environment, or browser JavaScript.
2. No browser request targets `/auth/v1`, `/rest/v1`, `/storage/v1`, or any other Supabase endpoint.
3. Supabase gateway, Postgres, Studio, and Storage have no host `ports:` mapping.
4. Only server-only modules can read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`.
5. Every BFF route authenticates the CRM session and checks CRM permission before querying or mutating Supabase.
6. Redis is never a source of truth and a Redis failure never makes CRM unavailable.

## Required configuration changes

### Docker

- Add the Supabase self-hosted Compose services to the production deployment, or run its Compose project with a shared external private network.
- Give CRM a server-only URL such as `SUPABASE_URL=http://supabase-gateway:8000`.
- Remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `Dockerfile`, the CRM Compose build args, `.env.example`, and deployment secrets supplied to the browser build.
- Keep `SUPABASE_SERVICE_ROLE_KEY` as a runtime secret in CRM only. Do not pass it as a build argument.
- Bind CRM itself to the reverse-proxy network only. The proxy is the sole service publishing `80`/`443`.

### Application configuration

- Replace `getSupabaseUrl()` and `getSupabaseAnonKey()` with a server-only configuration module.
- Make any import of the server Supabase client fail client compilation by using `import 'server-only'`.
- Remove `createBrowserClient` and `getSupabaseClient` usages from client components and browser-side database modules.
- Replace Supabase Auth browser cookies with a CRM-owned, HttpOnly session cookie. The session must contain only an opaque id or a signed minimal claim set; never send a Supabase token to the browser.

## API design

Do not build a generic `/api/supabase/*` proxy. Create domain APIs that expose only operations the UI needs.

| Domain | Example endpoints | Notes |
|---|---|---|
| Session | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Existing routes become the sole Auth boundary |
| Dashboard | `GET /api/dashboard` | Aggregate server-side to avoid client fan-out |
| Customers | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` | Filter, pagination, permission check in BFF |
| Bookings | `GET/POST /api/bookings`, `GET/PATCH /api/bookings/:id` | Return booking and required children atomically |
| Guides | `GET/POST /api/guides`, `PATCH /api/guides/:id`, `POST /api/guides/:id/avatar` | Move direct avatar upload here |
| Products | Existing `/api/products` and `/api/products/facets` | Keep and expand the existing server pattern |
| Gallery | Existing `/api/photos/upload/*` and `/api/photos/delete` | Keep server-side Storage write path |

Each handler follows one sequence:

```text
validate input → resolve CRM session → check permission → read/write Supabase
→ invalidate Redis keys after a write → return DTO
```

Use Zod schemas at the HTTP boundary. Do not return raw Supabase rows when a domain DTO can omit sensitive fields.

## Data-layer migration

1. Add `lib/supabase/server.ts`, marked `server-only`, to construct the internal Supabase client.
2. Move query logic out of `lib/db/supabase/*` browser modules into domain repositories such as `lib/customers/customer-repository.ts` and `lib/bookings/booking-repository.ts`.
3. Reuse existing row mappers, but call them only in server repositories.
4. Replace generic browser hydrate and auto-sync with API fetchers and optimistic mutations scoped to each domain.
5. Delete browser imports of `lib/supabase/client.ts`, then remove that client module and `@supabase/ssr` browser usage.
6. Move guide-avatar upload to the new guide API route. Keep the existing gallery upload API flow.
7. After every domain has migrated, delete the old browser sync, hydrate, and public Supabase environment helpers.

Prefer a vertical migration order: Products and Guides first (already have server API patterns), then Customers/Leads, Bookings/Tour Design, Finance/Staff, and remaining reference data. Do not run old direct sync and new BFF writes for the same table in production at the same time.

## Redis plan

Use the existing `lib/redis/client.ts`; do not add a second Redis client or a new caching package.

### Cache candidates

| Data | Key pattern | TTL | Invalidate when |
|---|---|---:|---|
| Product facets | `cache:products:facets:v1:<hash>` | 5 min | Product or pricing changes |
| Product lists | `cache:products:list:v1:<permission>:<hash>` | 1–5 min | Product or pricing changes |
| Dashboard summary | `cache:dashboard:v1:<user-or-role>` | 30–60 sec | Related booking, lead, finance, task changes |
| Sidebar badge counts | `cache:sidebar:v1:<role>` | 30–60 sec | Related table changes |
| Permission snapshot | `cache:permissions:v1:<user-id>` | 1–5 min | Role or assignment changes |

Do not cache session validity, authorization decisions beyond their short permission snapshot, mutable edit forms, uploaded files, or personally sensitive records without a clear per-user key and invalidation rule.

Reads use cache-aside: read Redis, query Supabase on a miss, then set a bounded TTL. Writes update Supabase first; only after success, invalidate affected keys. If Redis is unavailable, execute against Supabase and return normally.

## Validation and rollout

1. Add an automated check that built browser assets contain no Supabase hostname, `NEXT_PUBLIC_SUPABASE`, `/rest/v1`, `/auth/v1`, or `/storage/v1` strings.
2. Verify no Supabase container has a host port mapping with `docker compose ps` and inspect Docker networks.
3. Add BFF integration tests for unauthenticated, unauthorized, allowed, validation-error, and Redis-down paths.
4. Shadow-read selected BFF endpoints against current data before switching UI callers.
5. Release one domain at a time behind a feature flag; remove the direct path only after parity checks succeed.
6. Run lint, typecheck, security review, and a browser network inspection before final cutover.

## Acceptance criteria

- Browser DevTools Network shows requests only to the CRM origin.
- A browser bundle search contains no Supabase URL or key.
- Blocking all outbound browser access to Supabase does not affect CRM operation.
- CRM continues operating when Redis is stopped, with lower cache hit rate only.
- Supabase services have no public host ports and still work from the CRM container.
