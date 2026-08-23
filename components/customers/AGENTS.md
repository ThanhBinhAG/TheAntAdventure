# components/customers/ — Agent overview

## Role
Customer form and profile modal UI.

## Contents
- Client form/profile modals — list via `useCustomerPage`; delete via `useDeleteCustomer` (BFF + local CASCADE cleanup); email uniqueness via `/api/customers/email-check`; form errors stay on-modal (no error toast)

## Boundaries
- Form/onboarding logic: `lib/customers` (`customer-delete.ts` for guard/cleanup).
