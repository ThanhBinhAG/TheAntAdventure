# app/api/customers/[id]/comms — Agent overview

## Role
BFF endpoint to log a communication for an existing customer (Clients profile modal).

## Contents
- `route.ts` — POST comm (`customers.write`); Zod body type/dir/date/subj/body

## Boundaries
- Domain: `createCustomerComm` in `lib/customers/customer-repository.ts`.
- No browser PostgREST / auto-sync for `comms`.
