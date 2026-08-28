# app/api/branding/ — Agent overview

## Role
Company branding endpoints (shared CRM logo).

## Contents
- `logo/route.ts` — GET/POST/DELETE company logo (versioned Storage `branding/logo-{ts}.webp` + `company_branding`)
- `logo/file/route.ts` — authenticated CRM-origin logo bytes (private bucket)

## Boundaries
- Auth via session + `company.read` for write; any authenticated user may GET.
