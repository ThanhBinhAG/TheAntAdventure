# e2e/ — Agent overview

## Role
Opt-in Playwright acceptance tests for Developer A and Developer B BFF flows against a disposable local or dedicated test stack.

## Contents
- `*.spec.ts` — browser-driven acceptance scenarios
- `support.ts` — test identity, database assertion, and cleanup helpers
- Dev A: `network-origin.spec.ts`, `catalogue-planner.spec.ts`, `tour-design.spec.ts`, `auth-session.spec.ts`
- Dev B: `dev-b-network-origin.spec.ts` (Fetch/XHR CRM-origin), `dev-b-domains.spec.ts` (401/403 + smoke CRUD)

## Boundaries
- Require `E2E_ALLOW_DATABASE_MUTATION=1`; never point at production.
- Create data only under the generated `E2E-` prefix and remove it in teardown.
