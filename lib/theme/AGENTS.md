# lib/theme/ — Agent overview

## Role
Per-user CRM UI appearance: color theme presets + independent font size, localStorage, document apply helpers.

## Contents
- `presets.ts` — color theme IDs, labels, `:root` color var maps
- `font-size.ts` — font size IDs (`small`…`xlarge`), px + UI `scale` for shell zoom
- `theme-storage.ts` — `crm.theme` + `crm.fontSize` localStorage (migrates legacy `comfortable`)
- `apply-theme.ts` — `applyAppearanceToDocument` / color + font apply (`--crm-ui-scale`) + `themeCssVars` for previews

## Boundaries
- Client-only preference — no Supabase / BFF.
- Color and font size are independent; changing one must not reset the other.
- Font size sets `--crm-font-size` and `--crm-ui-scale`; `zoom` applies on `#main` only so the sidebar chrome stays fixed size.
- Do not overload `crm_catalog_items` or org branding for UI chrome themes.
- Proposal PDF themes stay in `lib/proposals/` (separate token set).
