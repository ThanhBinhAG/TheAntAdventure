# app/api/photos/all — Agent overview

## Role
Read-only BFF endpoint for gallery photos used by CRM features.

## Contents
- `route.ts` — returns gallery photos and tags through CRM BFF.

## Boundaries
- Enforce `gallery.read`; do not expose Supabase access to the browser.
