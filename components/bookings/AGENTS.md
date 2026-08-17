# components/bookings/ — Agent overview

## Role
Bookings CRM UI: list, detail modal, on-tour forms.

## Contents
- `BookingsPage.tsx` — main Bookings screen (includes detail modal + on-tour form); page shell is `pages/Bookings.tsx`

## Boundaries
- Prefer extracting modals/forms into sibling files when editing further. Keep `pages/Bookings.tsx` thin.
