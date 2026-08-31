# lib/tax/ — Agent overview

## Role
Tax Reports DTOs, CSV export helper, and server-only repository.

## Contents
- `tax-input.ts` — query schema + `TaxListItem` DTO
- `tax-export.ts` — CSV builder + filename helper
- `tax-repository.ts` — list + export row assembly

## Boundaries
- Page UI lives under `components/tax`; read/export only.
- Do not return raw Supabase rows.
