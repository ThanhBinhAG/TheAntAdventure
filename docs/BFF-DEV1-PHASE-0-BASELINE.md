# Dev 1 Phase 0 — Baseline

Baseline recorded on 2026-08-27 before the Dev 1 server-only configuration and CRM-owned-session cutover. It records observed state only; no implementation behaviour was changed.

## Verification results

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | pass | ESLint completed with `--max-warnings=0`. |
| `npm run typecheck` | pass | `tsc --noEmit` completed. |
| `npm test` | pass | 253 passed, 5 skipped, 0 failed (258 tests). |
| `npm run build` | pass | Next.js 16.3.1 production build completed. |
| `node scripts/check-supabase-leakage.mjs` | fail | Five client-bundle hits, listed below. |
| `npm run test:e2e -- --list` | pass | 18 Chromium tests in 6 files were discovered; browser execution is not part of this baseline. |

`BFF-TASK.md` still describes the older 59/86-file, 27-failure test baseline. That is stale: the current Linux unit-test baseline is green. The cross-platform test runner remains a Dev 1 task because `package.json` still invokes POSIX `find` and `/dev/null`.

## Leakage baseline

The leakage check found these browser chunks:

- `4920-0d35c020a4f27223.js`: public Supabase environment string and `/storage/v1`.
- `app/(crm)/layout-124ab305ba9862b2.js`: public Supabase environment string.
- `app/system/debug/page-d503904c7ad3286d.js`: public Supabase environment string and `/auth/v1`.

Static source evidence:

| Boundary | Evidence | Owner |
| --- | --- | --- |
| Browser client and generic data stack | `lib/supabase/client.ts`, `lib/supabase/index.ts`, `lib/db/supabase/shared.ts`, `components/StoreProvider.tsx` | Dev 2; Dev 1 provides the server-only replacement boundary. |
| Browser Storage URL handling | `lib/gallery/storage-image-src.ts`, `lib/gallery/gallery-helpers.ts`, `next.config.mjs` | Dev 2, coordinated with Dev 1 environment removal. |
| Browser debug-page string | `components/system/DebugPanel.tsx` | Dev 1. |
| Server-only Supabase configuration | `lib/env.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, Docker/Compose/CI env wiring | Dev 1. |

The final leakage gate must be hard-fail. Until Dev 2 removes browser Supabase I/O, it is expected to fail and must remain visible in CI rather than being suppressed with a permanent allowlist.

## Session baseline

The current implementation has not reached the target CRM-owned session model:

- `lib/auth/supabase-cookie-names.ts` defines the `sb-crm-access-token` mirror cookie.
- `lib/supabase/middleware.ts` refreshes Supabase SSR cookies and mirrors an access JWT.
- `lib/auth/session.ts` verifies that cookie through Supabase JWKS before building an auth context.
- Existing auth and E2E tests deliberately assert this legacy Supabase-cookie contract.

Phase 2 must replace those behaviours with an opaque `crm_session` cookie and durable server-side session records. Its tests must be rewritten as an intentional contract migration, not treated as incidental regressions.

## Working-tree safety

There were pre-existing uncommitted edits in 31 files, including `.env.example`, Docker/Compose, GitLab CI, `lib/env.ts`, `proxy.ts`, leakage scripts, tests, and BFF documentation. Dev 1 work must preserve and review those changes; this baseline document does not overwrite them.

## Phase 0 exit criteria

- [x] Baseline commands and their results are recorded.
- [x] Unit-test failures are classified: there are currently none.
- [x] Leakage locations and their owners are recorded.
- [x] E2E discovery is confirmed.
- [ ] Cross-platform execution and full browser E2E remain Phase 3 work.

## Phase 1 update — 2026-08-27

Dev 1 server configuration is now isolated below `lib/server/env/`; its modules
are server-only and read only runtime `SUPABASE_*` values. Docker and both Compose
files no longer receive any Supabase build argument, and the browser compatibility
boundary returns no Supabase configuration while the generic client hydrate stack is
being replaced.

Verification after the change: lint, typecheck, production build, and 254 unit
tests pass. The leakage gate now has one remaining `/storage/v1` client-bundle hit
from `lib/gallery/storage-image-src.ts`; this is the Dev 2 gallery-asset URL
normalization dependency and remains intentionally visible rather than allowlisted.

## Phase 2 update — 2026-08-27

The legacy Supabase SSR-cookie contract has been replaced in source with the
CRM-owned opaque `crm_session` contract. The new migration revokes legacy
encrypted-payload rows, stores only a hash of a high-entropy cookie token, and
stores Supabase credentials as AES-GCM ciphertext server-side. The remaining
Phase 2 rollout work is applying the migration to each environment and
validating the real Supabase/Auth deployment path.

## Phase 3 update — 2026-08-27

The local platform gate is now `npm run test:platform`; it discovers the Dev 1
auth, durable-session, Proxy, request-context, JWKS, and Redis resilience tests
using a Node-only runner. `npm test`, `npm run dev`, and Playwright's web server
now use Node launchers rather than POSIX shell syntax, so their invocation is
portable to Windows and Linux. The Docker verifier runs lint, typecheck, all
unit tests, build, and a leakage report in that order. The leakage report remains
non-blocking only while the known Dev 2 `/storage/v1` browser dependency exists;
`npm run leakage:check` is the cross-platform hard-fail command for final cutover.
