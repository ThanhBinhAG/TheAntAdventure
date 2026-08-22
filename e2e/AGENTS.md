# e2e/ — Agent overview

## Role
Opt-in Playwright acceptance tests for Developer A BFF flows against a disposable local or dedicated test stack.

## Contents
- `*.spec.ts` — browser-driven acceptance scenarios
- `support.ts` — test identity, database assertion, and cleanup helpers

## Boundaries
- Require `E2E_ALLOW_DATABASE_MUTATION=1`; never point at production.
- Create data only under the generated `E2E-` prefix and remove it in teardown.
