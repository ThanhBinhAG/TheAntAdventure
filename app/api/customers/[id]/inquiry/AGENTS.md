# app/api/customers/[id]/inquiry — Agent overview

## Role
BFF endpoint to create a new Inquiry lead for an existing customer (Clients profile modal).

## Contents
- `route.ts` — POST inquiry (`customers.write`); body optional `{ flagTourDesign }`

## Boundaries
- Domain: `createCustomerInquiry` in `lib/customers/customer-repository.ts`.
- Invalidates dashboard cache after insert. No browser PostgREST / auto-sync.
