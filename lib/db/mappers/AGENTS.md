# lib/db/mappers/ — Agent overview

## Role
Row ↔ domain object mappers for Supabase hydrate/push. Pure transforms; no I/O.

## Contents
- `shared.ts` — `fkOrNull`, `Row`, money helpers (internal)
- `crm.ts` — customer, agent, lead, booking, comm
- `catalogue.ts` — attraction, product, pricing, photo junctions
- `people-ops.ts` — guide, staff (+ extended), supplier
- `finance.ts` — finance, AR, AP, tax
- `media-messages.ts` — photo, folder, chat messages
- `ops-content.ts` — task, calendar, notes, feedback, contract, cruise/transport/restaurant/hotel
- `tour.ts` — tour draft + outline day
- `index.ts` — public barrel

## Boundaries
- Do not change function bodies/signatures when splitting.
- Consumers import `@/lib/db/mappers` (stable barrel via `lib/db/mappers.ts`).
- Keep `money` / `Row` internal unless a caller already needed them.
