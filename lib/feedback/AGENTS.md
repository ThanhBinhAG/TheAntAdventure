# lib/feedback/ — Agent overview

## Role
Post-tour feedback Zod/DTO/ids and server-only repository for the `feedback` table.

## Contents
- `feedback-input.ts` — Zod create + `FeedbackListItem` DTO
- `feedback-ids.ts` — `nextFeedbackId` (`FB-NNN`)
- `feedback-repository.ts` — server-only list/get/create

## Boundaries
- Page UI lives under `components/post-tour`; keep persistence in the repository.
- Do not return raw Supabase rows — map via `rowToFeedback` / DTO.
- Customer profile and dashboard NPS keep their own server reads; invalidate dashboard cache on create.
