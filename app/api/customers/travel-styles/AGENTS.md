# app/api/customers/travel-styles — Agent overview

## Role

Owns the authenticated BFF endpoint for the Travel Style catalogue used by the Customer form.

## Contents

- `route.ts` — reads and updates the catalogue for users with customer write access.

## Boundaries

- Keep browser database access out of this folder; use `bffRoute` and the customer repository.
