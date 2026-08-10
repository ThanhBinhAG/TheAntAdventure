# app/api/photos/upload/complete/ — Agent overview

## Role
Finalize upload: Sharp child → delete original → WebP variants → Storage + DB.

## Contents
- `route.ts` — POST JSON metadata + `uploadId`

## Boundaries
- Cleans up temp session on success or failure after process attempt.
