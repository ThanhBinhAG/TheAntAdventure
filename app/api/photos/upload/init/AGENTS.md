# app/api/photos/upload/init/ — Agent overview

## Role
Start a gallery chunked upload session (temp disk metadata).

## Contents
- `route.ts` — POST JSON `{ photoId, fileName, mime, totalBytes }`; checks per-user rate limit on `totalBytes`

## Boundaries
- No Sharp here; only rate-limit + session create (`lib/image-pipeline/upload-session.ts`).
