# components/settings/ — Agent overview

## Role
CRM Settings hub: landing list of setting areas; Catalogs and Theme open as nested sections.

## Contents
- `SettingsPage.tsx` — hub (`/settings`) + `?section=catalogs|theme` drill-in
- `CatalogKindsNav.tsx` — left submenu of catalog kinds
- `CatalogItemsPanel.tsx` — CRUD list for one kind
- `ThemePanel.tsx` — color preset grid + font size options with live apply / mini preview

## Boundaries
- Catalogs API: `/api/settings/catalogs`. Domain: `lib/settings`.
- Theme: client-only (`lib/theme`, `hooks/useTheme`) — no BFF.
- Do not put Settings widgets under `components/pages` (thin shell only).
- Add future setting areas as hub cards + `section=` handlers — keep `/settings` as the entry hub.
