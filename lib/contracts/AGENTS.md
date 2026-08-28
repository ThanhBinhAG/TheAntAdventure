# lib/contracts/ — Agent overview

## Role
Guest contract HTML builders plus Contracts BFF Zod/DTO/ids and server-only repository.

## Contents
- `contract-html.ts` — print / Word HTML helpers (client-safe)
- `contract-input.ts` — Zod create/update + `ContractListItem` DTO
- `contract-ids.ts` — `nextContractId` (`CTR-YYYY-NNN`)
- `contract-repository.ts` — server-only list/get/create/update

## Boundaries
- Page UI lives under `components/contracts`; keep persistence in the repository.
- Do not return raw Supabase rows from the BFF — map via `rowToContract` / DTO.
