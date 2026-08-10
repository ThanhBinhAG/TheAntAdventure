# app/api/photos/upload/chunk/ — Agent overview

## Role
Append one ordered chunk to a gallery upload session file.

## Contents
- `route.ts` — POST multipart `uploadId`, `chunkIndex`, `chunk`

## Boundaries
- Enforces chunk order/size; no Storage writes.
