# components/customers/ — Agent overview

## Role
Customer form and profile modal UI.

## Contents
- Client form/profile modals — delete via `useDeleteCustomer` (remote + local CASCADE cleanup)

## Boundaries
- Form/onboarding logic: `lib/customers` (`customer-delete.ts` for guard/cleanup).
