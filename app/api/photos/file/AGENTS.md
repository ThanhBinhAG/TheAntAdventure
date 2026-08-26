# app/api/photos/file/ — Agent overview

## Role
Authenticated CRM-origin delivery of allow-listed gallery image variants.

## Contents
- `route.ts` — downloads `gallery/*/(display|thumb).webp` from the photos bucket.

## Boundaries
- Do not proxy arbitrary URLs or storage paths; validate the gallery variant path first.
