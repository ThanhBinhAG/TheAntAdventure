# lib/seeds/ — Agent overview

## Role
Static seed datasets for local/offline CRM bootstrap.

## Contents
- `index.ts` barrel + domain seed modules (`customers`, `leads`, `products`, …)

## Boundaries
- Some seeds are imported directly (not all re-exported). Prefer explicit imports when unsure.
