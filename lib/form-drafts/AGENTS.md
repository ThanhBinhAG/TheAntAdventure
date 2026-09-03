# lib/form-drafts/ — Agent overview

## Role
Browser `localStorage` helpers for unsaved Clients / B2B Agents form drafts (not server-synced). Supports multiple add drafts plus one edit draft per entity.

## Contents
- `storage.ts` — key builder, create id, read / write / clear / list, legacy `add.new` migrate

## Boundaries
- Payload shapes live with the form modules; this folder stays domain-agnostic.
- Do not use for Tour Design / server `tour_drafts`.
- UI listing: `components/FormDraftsBar.tsx` on Customers / Agents pages.
