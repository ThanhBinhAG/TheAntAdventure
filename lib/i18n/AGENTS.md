# lib/i18n/ — Agent overview

## Role
EN/VI UI strings for CRM chrome and page-scoped copy. **UI labels only** — never translate Supabase record content (names, notes, tour text, user-entered data).

## Contents
- `common.ts` — cross-page buttons, pagination, unsaved-changes / leave-with-draft dialog (`tc()`)
- `stages.ts` — pipeline stage labels (`tStage()`)
- `enums.ts` — display labels for coded fields (e.g. attraction region/type)
- `language-storage.ts` — `localStorage` key `crm.language`
- `page-titles.ts` — Topbar titles from `NAV_SECTIONS`
- `page-dict.ts` — helper to build typed page dictionaries
- `translate.ts` — `tp(page, key)` / `tpl(page, key, vars)` registry
- `pages/` — page-scoped copy (sales, access-control, attractions, …)

## Usage
```tsx
const { tp, tpl, tc, pageTitle } = useLanguage();
tp('attractions', 'searchPlaceholder');
tpl('customers', 'clientCount', { count: 5 });
pageTitle('dashboard'); // slug-based title
```

## Boundaries
- Prefer adding keys here over hardcoding new UI strings in components.
- DB-driven permission names: use `tacPermission(code, fallback, lang)` pattern from access-control.
- Do not put app TypeScript outside `lib/i18n/` for copy.
