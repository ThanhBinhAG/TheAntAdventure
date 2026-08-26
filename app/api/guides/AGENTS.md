# app/api/guides/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Guides data and guide avatar files.

## Contents
- `route.ts` — read, create, and update Guide records
- `avatar/route.ts` — authorized avatar upload and proxy delivery

## Boundaries
- Delegate validation and storage/data logic to `lib/guides`.
- Never return a public Supabase storage URL to the browser.
