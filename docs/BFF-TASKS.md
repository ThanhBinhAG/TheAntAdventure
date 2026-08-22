# BFF Migration Tasks

## Definition of done

The migration is complete only when browser network traffic targets the CRM origin exclusively, Supabase has no host port mapping, and CRM remains usable when Redis is unavailable.

## Work order

Tasks are ordered by dependency. Do not remove a direct browser-Supabase path until its BFF replacement has passed parity checks.

## Current delivery scope

This first BFF delivery is intentionally limited to the following features. All other CRM domains in later generic phases are deferred and must not expand the current sprint scope.

| Feature | Owner | End-to-end responsibility |
|---|---|---|
| Auth & Session | Developer A | Login/logout, HttpOnly CRM session, refresh/revoke, middleware, permission enforcement, tests |
| Daily Planner | Developer A | Repository/API, authorization, UI/hook migration, tests |
| Attraction Schedule | Developer A | Province attraction data, schedule API, UI/hook migration, tests |
| Tour Design | Developer A | Draft/outline API, child-record writes, UI/hook migration, tests |
| Tour Product | Developer A | Product/pricing API, Redis cache, UI/hook migration, tests |
| Clients | Developer B | Customer API, search/pagination, UI/hook migration, tests |
| B2B Agents | Developer B | Agent API, UI/hook migration, tests |
| Sales Pipeline | Developer B | Lead/pipeline API, UI/hook migration, tests |
| Photo Gallery | Developer B | Gallery metadata, upload/delete CRM APIs, UI/hook migration, tests |
| Weather Guide | Developer B | Weather read/refresh APIs, UI/hook migration, tests |

For every feature, its owner delivers the repository/API, authorization, cache invalidation where applicable, UI caller, tests, and removal of its direct browser-Supabase path. The second developer reviews the completed feature.

## Two-developer allocation

Each developer owns an entire feature vertically: repository, BFF API, authorization, Redis invalidation where applicable, UI/hooks, tests, and removal of that feature's direct browser-Supabase path. Do not divide one feature into a Developer A backend half and a Developer B frontend half. Infrastructure is owned by the user/Owner-Ops, not either developer. Neither developer removes shared legacy sync code until the final integration phase.

| Phase | Developer A — end-to-end feature owner | Developer B — end-to-end feature owner | Integration checkpoint |
|---|---|---|---|
| 0 | T0.1 current traffic baseline; T0.3 CI leakage check | T0.2 direct-import inventory and UI/domain map | Agree the inventory and API contract list |
| 1 | **Owner-Ops:** private Docker topology and internal Supabase handoff | **Owner-Ops:** Redis, reverse proxy, secrets, and deployment verification | Private development environment handed to both developers |
| 2 | T2.1 server Supabase client; T2.2 BFF primitives; T2.3 CRM sessions | DTO contracts and shared test fixtures | Merge shared contract types before domain APIs |
| 3 | Shared cache helper and cache policy | Redis-down test harness and cache regression tests | Cache policy review |
| 4 | **Tour Product end-to-end:** API, Redis cache, UI, test | **Photo Gallery end-to-end:** upload/delete APIs, UI, test | Browser traffic audit for these features |
| 5 | **Daily Planner and Attraction Schedule end-to-end** | **Clients and B2B Agents end-to-end** | Merge one completed vertical feature at a time |
| 6 | **Tour Design end-to-end** | **Sales Pipeline and Weather Guide end-to-end** | No new direct Supabase import allowed |
| 7 | Coordinate removal of public configuration with Owner-Ops | Parity, permissions, and browser acceptance | Final cutover together |

### Owner-Ops prerequisite: private infrastructure

The user/Owner-Ops completes Phase 1. Before Developer A or B starts feature work, hand over:

- [ ] Private Docker network containing CRM, Redis, Supabase gateway, Auth, Storage, Realtime, Studio, and Postgres.
- [ ] Only reverse proxy ports `80`/`443` published; no host mapping for CRM, Redis, Supabase, or Postgres.
- [ ] Server-only `SUPABASE_URL` service hostname, runtime-secret injection method, and CRM development endpoint.
- [ ] Redis `REDIS_URL`, health verification, reverse-proxy configuration, firewall configuration, and deployment validation.
- [ ] Evidence that CRM can reach Supabase internally while a browser cannot resolve or reach Supabase.

### Developer A task list

- [x] A0. Complete Auth & Session end-to-end: login/logout, HttpOnly CRM session, session validation/refresh/revocation, middleware redirects, permission enforcement, tests, and removal of browser Supabase token handling.
- [x] A0.1. Establish BFF API conventions, error format, auth/permission middleware, and server-only Supabase client.
- [x] A1. Implement the shared Redis cache wrapper and cache invalidation contract.
- [x] A2. Complete Tour Product end-to-end: product/pricing API/repository/cache, UI/hooks, tests, and direct-path removal.
- [x] A3. Complete Daily Planner end-to-end: planner API/repository, authorization, UI/hooks, tests, and direct-path removal.
- [x] A4. Complete Attraction Schedule end-to-end: province-attraction/schedule API/repository, UI/hooks, tests, and direct-path removal.
- [x] A5. Complete Tour Design end-to-end: draft/outline API/repository, child-record write safety, UI/hooks, tests, and direct-path removal.
- [ ] A6. Coordinate final removal of public Supabase runtime/build configuration with Owner-Ops after all nine scoped features pass acceptance.

### Developer B task list

- [ ] B0. Produce and maintain the direct browser-Supabase inventory, mapping every caller to an API replacement.
- [ ] B1. Define shared domain DTOs and test fixtures jointly with Developer A.
- [ ] B2. Complete Clients end-to-end: customer API/repository, server search/pagination, UI/hooks, tests, and direct-path removal.
- [ ] B3. Complete B2B Agents end-to-end: agent API/repository, UI/hooks, tests, and direct-path removal.
- [ ] B4. Complete Sales Pipeline end-to-end: lead/pipeline API/repository, UI/hooks, tests, and direct-path removal.
- [ ] B5. Complete Photo Gallery end-to-end: gallery metadata plus existing upload/delete CRM APIs, UI/hooks, tests, and direct-path removal.
- [ ] B6. Complete Weather Guide end-to-end: weather API/repository, refresh authorization, UI/hooks, tests, and direct-path removal.
- [ ] B7. Replace generic browser hydrate and auto-sync only for fully migrated scoped features.
- [ ] B8. Build browser-network, parity, permission, and Redis-down regression coverage; lead final UI acceptance.

### Shared rules and handoffs

1. **One feature, one owner.** The owner delivers the repository/API, UI caller, permission tests, cache invalidation, and safe removal of that feature's direct path. The other developer reviews; they do not own a half-feature.
2. **API contract first.** The feature owner proposes the route schema and DTO; the other developer reviews it. Mocked UI is allowed, but the feature owner owns real integration.
3. **One feature per pull request.** A feature PR includes repository/API, caller migration, permission tests, cache invalidation, and removal of that feature's direct client path where safe.
4. **Shared-file ownership.** Developer A owns BFF primitives, `lib/supabase/server.ts`, and Redis helpers. Developer B owns shared test fixtures and acceptance coverage. Owner-Ops owns Docker, reverse proxy, secrets, and firewall. Coordinate before editing `lib/db/*`, auth middleware, or shared types.
5. **Feature flag during handoff.** Keep a short-lived domain-level flag only while validating a new BFF endpoint against the old path. Remove the old path and flag as soon as parity passes.
6. **Twice-weekly integration checkpoint.** Review new direct imports, browser network capture, API latency, cache invalidation, and outstanding feature inventory.
7. **Final merge order.** Merge the Owner-Ops handoff and server foundation first; migrate independent features in parallel; remove generic browser sync only after every inventory item is closed.

### Phase 0 — Baseline and guardrails

- [ ] **T0.1 — Record current browser traffic**
  - Capture login, dashboard, Daily Planner, Clients, B2B Agents, Attraction Schedule, Sales Pipeline, Tour Design, Tour Product, Photo Gallery, Weather Guide, and logout requests.
  - Record response shape, permissions, and error behaviour for each path.
  - Done when: a checked-in test checklist exists and the team has a baseline to compare after each migration.

- [ ] **T0.2 — Inventory direct browser-Supabase imports**
  - Find every client-side import of `lib/supabase/client`, `getSupabaseClient`, and browser-side `lib/db/supabase` code.
  - Map each operation to its tables, Storage bucket, permission, UI caller, and target BFF endpoint.
  - Done when: no direct dependency is unowned or lacks a migration task.

- [ ] **T0.3 — Add CI leakage checks**
  - After production build, scan `.next` browser assets for the configured Supabase hostname, `NEXT_PUBLIC_SUPABASE`, `/auth/v1`, `/rest/v1`, and `/storage/v1`.
  - Exclude server-only build artifacts deliberately and document the exclusion.
  - Done when: CI fails if a client bundle exposes a Supabase URL or API path.

### Phase 1 — Private infrastructure (Owner-Ops)

- [ ] **T1.1 — Owner-Ops: Create the private Docker topology**
  - Run CRM, Redis, Supabase gateway, Auth, Storage, Realtime, Studio, and Postgres on one private Compose network.
  - Publish only the reverse proxy's `80`/`443`; do not publish CRM or any Supabase port.
  - Done when: `docker compose ps` shows no host mappings for Supabase, Postgres, Redis, or CRM.

- [ ] **T1.2 — Owner-Ops: Configure server-only Supabase access**
  - Add `SUPABASE_URL=http://supabase-gateway:8000` and server keys to CRM runtime secrets.
  - Do not pass server keys as Docker build args.
  - Done when: a shell inside the CRM container reaches the gateway, while a browser cannot resolve or connect to it.

- [ ] **T1.3 — Owner-Ops: Make Redis internal and observable**
  - Remove Redis host port publishing unless an explicitly approved admin-only use needs it.
  - Keep `REDIS_URL=redis://redis:6379`, health checking, bounded connect timeout, and graceful fallback.
  - Done when: CRM health/diagnostics show Redis state without exposing Redis publicly.

### Phase 2 — Server foundation

- [ ] **T2.1 — Add a server-only Supabase client**
  - Create `lib/supabase/server.ts` with `import 'server-only'`.
  - Construct the internal Supabase client only from non-public environment variables.
  - Define separate helpers for admin/service operations and user-scoped operations; do not use service role by default.
  - Done when: client components cannot import the server client and TypeScript/build catches misuse.

- [ ] **T2.2 — Create BFF request primitives**
  - Standardize Zod input parsing, CRM-session lookup, permission checks, success responses, error mapping, and audit context.
  - Reuse existing auth/access-control helpers rather than duplicating policy logic.
  - Done when: one sample route follows the shared pattern and has tests for 401, 403, 422, and 500 responses.

- [ ] **T2.3 — Introduce CRM-owned sessions**
  - Make the browser receive only an HttpOnly CRM session cookie; keep Supabase tokens server-side or avoid issuing them to the browser entirely.
  - Update login, logout, middleware, refresh, and session revocation flows.
  - Done when: browser cookies and local/session storage contain no Supabase access or refresh token.

- [ ] **T2.4 — Create server repositories**
  - Move Supabase queries behind domain repositories such as `lib/customers`, `lib/bookings`, `lib/guides`, and `lib/products`.
  - Reuse current row mappers on the server and return purpose-built DTOs.
  - Done when: new API route handlers do not query Supabase inline except for trivial one-off operations.

### Phase 3 — Cache foundation

- [ ] **T3.1 — Standardize cache helpers**
  - Build a small server-only wrapper around the existing `lib/redis/client.ts` for JSON get/set/delete and namespaced keys.
  - Preserve the current rule: any Redis error is a cache miss, never an API failure.
  - Done when: Product facet cache uses the shared helper without a behaviour regression.

- [ ] **T3.2 — Define cache ownership and invalidation**
  - Maintain a table mapping endpoint/domain to cache key prefix, TTL, scope, and write invalidators.
  - Start with Products, dashboard summaries, sidebar badges, and permission snapshots.
  - Done when: every new cache key has an owner and explicit invalidation trigger.

- [ ] **T3.3 — Test Redis-degraded operation**
  - Run BFF API tests with Redis unavailable.
  - Done when: reads fall back to Supabase, writes succeed, and no stale success is returned after a write.

### Phase 4 — Migrate existing server-friendly domains

- [ ] **T4.1 — Complete Products BFF**
  - Use and extend the existing `/api/products` and `/api/products/facets` patterns.
  - Move all Product browser reads/writes to these APIs; apply pagination/filtering server-side.
  - Invalidate product list and facets caches after product/pricing changes.
  - Done when: product screens have no browser Supabase client import.

- [ ] **T4.2 — Complete Gallery and branding BFF**
  - Retain the existing server-side gallery chunk/upload routes.
  - Audit photo delete, metadata writes, public URL generation, and logo uploads so all Storage access is server-mediated.
  - Done when: browser only uploads to CRM `/api/photos/*` or branding endpoints.

- [ ] **T4.3 — Migrate Guides and avatar upload**
  - Add guide list/detail/create/update APIs and `POST /api/guides/:id/avatar`.
  - Move image conversion/upload from `GuidesPage` into the route or a server worker.
  - Done when: `GuidesPage` has no `createClient()` import and no direct Storage call.

### Phase 5 — Migrate CRM business domains

- [ ] **T5.1 — Customers, leads, agents, and communications**
  - Add list/detail/mutation APIs with server pagination and search.
  - Replace generic hydrate/sync for these tables with domain fetchers and optimistic UI updates.
  - Invalidate dashboard and sidebar caches after writes.
  - Done when: these routes work without `getSupabaseClient()` in browser code.

- [ ] **T5.2 — Bookings, tour design, and proposals**
  - Provide aggregate read/write endpoints that update parent and child records transactionally where required.
  - Keep existing PDF export routes server-side.
  - Done when: booking edits retain existing validation and no partial client-driven sync remains.

- [ ] **T5.3 — Finance, staff, tasks, contracts, and feedback**
  - Implement API/repository pairs by domain and apply permission checks for sensitive fields.
  - Use per-user/role cache keys for summaries; do not cache raw sensitive lists broadly.
  - Done when: permission tests cover each sensitive write path.

- [ ] **T5.4 — Remaining reference domains**
  - Migrate attractions, cruises, transport, restaurants, hotels, suppliers, calendar events, weather reads, and dev notes.
  - Done when: the direct-sync inventory from T0.2 is fully closed.

### Phase 6 — Replace the frontend data model

- [ ] **T6.1 — Build API fetchers and mutation hooks**
  - Use the existing fetch/SWR stack where appropriate; keep Zustand for UI state rather than as a full database replica.
  - Scope cached client state per route/domain and make mutations invalidate or update only related records.
  - Done when: page reload and navigation fetch only data required for that screen.

- [ ] **T6.2 — Remove generic browser hydrate and auto-sync**
  - Delete or retire browser-side `lib/db/supabase` hydrate/push/auto-sync paths after every domain has migrated.
  - Remove related `NEXT_PUBLIC_USE_SUPABASE`, auto-sync, and read-only feature flags.
  - Done when: browser bundles compile without `@supabase/ssr` client usage.

- [ ] **T6.3 — Add CRM-native realtime strategy if required**
  - Prefer cache revalidation or short polling first.
  - If live updates are necessary, add an authenticated CRM SSE/WebSocket endpoint; only CRM connects to Supabase Realtime internally.
  - Done when: browser has no direct Realtime connection.

### Phase 7 — Cutover and hardening

- [ ] **T7.1 — Run parity and permission tests**
  - Compare data and user-visible behaviour against the Phase 0 baseline.
  - Test owner, manager, ordinary user, unauthenticated user, invalid payload, and forbidden object access.
  - Done when: all migrated domains pass UI and API acceptance tests.

- [ ] **T7.2 — Remove public Supabase configuration**
  - Delete `NEXT_PUBLIC_SUPABASE_URL`, anon key, browser client modules, and any proxy paths to Supabase.
  - Rotate Supabase API keys after removal from builds/deploy environments.
  - Done when: leakage CI passes and browser DevTools shows only CRM-origin calls.

- [ ] **T7.3 — Lock down and document operations**
  - Firewall the host, validate Compose port mappings, document backup/restore, key rotation, and Redis flush recovery.
  - Add alerts for CRM error rate, Supabase reachability, Redis availability, and cache hit rate.
  - Done when: an operator can deploy, diagnose, and recover the private topology without exposing Supabase.

## Required test gates

Run these gates at the end of every phase that changes code:

```bash
npm run lint
npm run typecheck
npm run build
```

Before final cutover, additionally verify:

- Browser DevTools has no Supabase request or WebSocket connection.
- The production browser bundle has no Supabase URL/key/API-path leakage.
- `docker compose ps` has no Supabase, Postgres, Redis, or CRM host port mapping.
- CRM works with Redis stopped.
- CRM fails safely and observably if Supabase is unreachable.

## Sequencing rules

- A task may begin only after its dependency phase is accepted.
- Migrate a complete domain vertically: repository, API, UI caller, cache invalidation, tests, then remove its direct path.
- Do not use a service-role client without an explicit BFF authorization check.
- Do not cache a successful write response before the database commit succeeds.
- Treat a public reverse-proxy path to Supabase as a failed acceptance criterion, even if it hides the port number.
