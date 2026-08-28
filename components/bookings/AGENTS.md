# components/bookings/ — Agent overview

## Role
Bookings CRM UI: list, detail modal, on-tour forms.

## Contents
- `BookingsPage.tsx` — main Bookings screen (BFF via `useBookingsPage` / create / update hooks)
- `BookingFormModal.tsx` — new booking form (inline validation like Clients)
- `BookingDetailModal.tsx` — detail + on-tour change forms

## Boundaries
- Page shell is `pages/Bookings.tsx` (thin). Data writes go through `/api/bookings`, not Zustand auto-sync.
