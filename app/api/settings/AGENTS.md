# app/api/settings — Agent overview

## Role
BFF for CRM Settings (catalog CRUD + form catalog reads).

## Contents
- `catalogs/route.ts` — GET (batch/kinds), PATCH replace, DELETE item; `settings.write` for mutations; read allowed for settings/customers/tour_design

## Boundaries
- Domain: `lib/settings` + travel styles repo for `travel_style` kind.
