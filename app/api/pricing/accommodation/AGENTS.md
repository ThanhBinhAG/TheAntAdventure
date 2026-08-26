# app/api/pricing/accommodation/ — Agent overview

## Role
CRM BFF routes for the Accommodation & Cruises pricing workbook.

## Contents
- `route.ts` — permissioned read, row update, and workbook replacement.

## Boundaries
- Use `lib/pricing/catalog-db.ts` on the server only; browser callers use CRM API routes.
