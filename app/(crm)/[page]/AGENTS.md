# app/(crm)/[page]/ — Agent overview

## Role
Dynamic CRM page route. Resolves `params.page` against `VALID_PAGES` / `PAGE_COMPONENTS` and renders the matching page shell.

## Contents
- `page.tsx` — slug → component dispatch + loading

## Boundaries
- Add routes via constants + `components/pages`, not new folders here.
- URL slug `tourdesign` stays unhyphenated even though UI lives in `components/tour-design`.
