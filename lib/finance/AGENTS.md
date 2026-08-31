# lib/finance/ — Agent overview

## Role
Finance / AR / AP read-only DTOs and server-only repository for the Finance BFF.

## Contents
- `finance-input.ts` — `FinanceListItem`, `ArListItem`, `ApListItem`, bundle response type
- `finance-repository.ts` — `listFinanceBundleServer`

## Boundaries
- Page UI lives under `components/finance`; no mutations until product adds write forms.
- Do not return raw Supabase rows — map via finance mappers / DTO.
