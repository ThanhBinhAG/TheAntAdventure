# hooks/ — Agent overview

## Role
Shared React hooks for language, pagination, pricing catalog, customer registration, and store access.

## Contents
- `useLanguage.ts`, `usePagination.ts`, `usePageSize.ts`, `usePricingCatalog.ts` (catalog GET inflight-deduped), `useProductPage.ts` (list + facets in parallel, GETs inflight-deduped), `useCustomerPage.ts` (Clients list GET inflight-deduped), `useCustomerProfile.ts` (Clients profile modal related rows via BFF), `useRegisterCustomer.ts` (BFF create/edit; store mirror under `withoutAutoSyncAsync`), `useDeleteCustomer.ts` (CRM `/api/customers` + local CASCADE; auto-sync suppressed), `useAgentPage.ts` (Agents list GET inflight-deduped; exports `fetchAgentJsonOnce` / `buildAgentPageUrl`), `useEnsureAgentsCatalogLoaded.ts` (seed from full list page or one session-memo `pageSize=96` GET), `useRegisterAgent.ts` / `useDeleteAgent.ts` (CRM `/api/agents` + store mirror; auto-sync suppressed), `useEnsureGalleryTablesLoaded.ts` (lazy gallery hydrate for pickers), `useSidebarBadges.ts` (deferred count API or store counts), `useInViewport.ts` (defer off-screen media), `useStore.ts` (re-export)

## Boundaries
- Domain logic stays in `lib/`; hooks wrap React usage only.
- `useDeleteCustomer` is BFF-first (`DELETE /api/customers/:id`); store cascade is best-effort, not required for delete to succeed.
- `useDeleteAgent` is BFF-first (`DELETE /api/agents/:id`); soft-blocks `AGT-001`.
- Page size preference is global (`localStorage` key `crm.pageSize`); list pages should use `usePageSize` with `PaginationBar`.
