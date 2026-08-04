# app/(crm)/[page]/ — Agent overview

## Role
Dynamic CRM page route. Resolves `params.page` against `VALID_PAGES` / `PAGE_COMPONENTS` and renders the matching page shell.

## Contents
- `page.tsx` — slug → PermissionGate → PageDataGate → page component

## Boundaries
- Add routes via constants + `components/pages`, not new folders here.
- URL slug `tourdesign` stays unhyphenated even though UI lives in `components/tour-design`.
- Route-scoped CRM data: `PageDataGate` + `PAGE_HYDRATE_TABLES` (shell loads in StoreProvider).
