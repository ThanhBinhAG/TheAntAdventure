# app/api/customers/hotel-tiers — Agent overview

## Role

Owns the read-only BFF endpoint that derives Customer Hotel Tier choices from active Hotels.

## Contents

- `route.ts` — returns unique normalized tiers to customer writers.

## Boundaries

- Do not add a Hotel Tier table or expose full Hotel records from this endpoint.
