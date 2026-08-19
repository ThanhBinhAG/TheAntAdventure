# hooks/ — Agent overview

## Role
Shared React hooks for language, pagination, pricing catalog, customer registration, and store access.

## Contents
- `useLanguage.ts`, `usePagination.ts`, `usePageSize.ts`, `usePricingCatalog.ts` (catalog GET inflight-deduped), `useProductPage.ts` (list + facets in parallel, GETs inflight-deduped), `useRegisterCustomer.ts`, `useDeleteCustomer.ts` (remote delete + rollback), `useEnsureGalleryTablesLoaded.ts` (lazy gallery hydrate for pickers), `useSidebarBadges.ts` (deferred count API or store counts), `useInViewport.ts` (defer off-screen media), `useStore.ts` (re-export)

## Boundaries
- Domain logic stays in `lib/`; hooks wrap React usage only.
- Page size preference is global (`localStorage` key `crm.pageSize`); list pages should use `usePageSize` with `PaginationBar`.
