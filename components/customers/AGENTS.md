# components/customers/ — Agent overview

## Role
Customer form and profile modal UI.

## Contents
- Client form/profile modals — list via `useCustomerPage`; profile tabs via `useCustomerProfile` (`GET /api/customers/:id/profile`); delete via `useDeleteCustomer` (BFF + local CASCADE cleanup); email uniqueness via `/api/customers/email-check`; form errors stay on-modal (no error toast)

## Boundaries
- Form/onboarding logic: `lib/customers` (`customer-delete.ts` for guard/cleanup).
