# lib/customers/ — Agent overview

## Role
Customer form shape, onboarding, and brief conversion.

## Contents
- `customer-form.ts`, `customer-onboarding.ts`, `customer-to-brief.ts`
- `customer-delete.ts` — booking guard, local CASCADE cleanup, rollback snapshot
- `customer-validation.ts` — email / phone / travel-date helpers
- `customer-list-input.ts` — Zod list/create/patch/email-check contracts for BFF
- `customer-repository.ts` — `server-only` PostgREST list/CRUD + profile context + `findDuplicateCustomerEmail` (`getServerSupabaseClient`)
- `nationalities.ts`, `countries.ts` — typeahead lists + membership checks

## Boundaries
- UI modals: `components/customers`. Tour brief handoff may touch `lib/tour-design`.
- HTTP: `app/api/customers`. Browser must not write customers via hydrate/auto-sync hooks.
