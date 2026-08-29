# app/api/branding/logo/file/ — Agent overview

## Role
Authenticated CRM-origin delivery of the company branding logo from the private `photos` bucket.

## Contents
- `route.ts` — resolves latest `branding/logo-*.webp` and streams bytes.

## Boundaries
- Do not return public Supabase storage URLs; reuse `downloadPhotosBucketObject`.
