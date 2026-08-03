# lib/customers/ — Agent overview

## Role
Customer form shape, onboarding, and brief conversion.

## Contents
- `customer-form.ts`, `customer-onboarding.ts`, `customer-to-brief.ts`
- `customer-validation.ts` — email / phone / travel-date helpers
- `nationalities.ts`, `countries.ts` — typeahead lists + membership checks

## Boundaries
- UI modals: `components/customers`. Tour brief handoff may touch `lib/tour-design`.
