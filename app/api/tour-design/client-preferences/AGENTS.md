# app/api/tour-design/client-preferences — Agent overview

## Role
Read-only BFF endpoint that supplies the shared Client Brief preference catalogs.

## Contents
- `route.ts` — active Travel Styles and Hotel Tiers for Tour Design.

## Boundaries
- Require `tour_design.read`; never mutate the catalog here.
