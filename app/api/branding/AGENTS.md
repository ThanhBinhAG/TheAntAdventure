# app/api/branding/ — Agent overview

## Role
Company branding endpoints (shared CRM logo).

## Contents
- `logo/route.ts` — GET/POST/DELETE company logo (Storage `branding/logo.webp` + `company_branding`)

## Boundaries
- Auth via session + `company.read` for write; any authenticated user may GET.
