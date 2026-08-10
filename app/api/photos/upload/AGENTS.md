# app/api/photos/upload/ — Agent overview

## Role
Gallery photo upload: init → chunk → complete (server Sharp, no per-file byte cap).

## Contents
- `init/` — session + rate limit
- `chunk/` — stream append to temp disk
- `complete/` — Sharp → delete original → Storage + DB

## Boundaries
- Session disk + Sharp: `lib/image-pipeline`. Do not store originals in the `photos` bucket.
