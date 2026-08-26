# lib/guides/ — Agent overview

## Role
Server contracts and repository for Guides BFF data and avatar delivery.

## Contents
- `guide-input.ts` — guide request validation contract
- `guide-repository.ts` — server-only guide read/write mapping
- `guide-avatar.ts` — CRM avatar proxy path and server upload
- `guide-avatar-client.ts` — browser request helper for the CRM avatar endpoint

## Boundaries
- Browser code calls `/api/guides`; it must not import the Supabase browser client.
- Storage access remains server-only and is authorized by the route handler.
