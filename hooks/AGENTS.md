# hooks/ — Agent overview

## Role
Shared React hooks for language, pagination, pricing catalog, customer registration, and store access.

## Contents

- `useLanguage.ts`, `useConfirmClose.ts` (unsaved-form close guard + `useFormDirty`), `usePagination.ts`, `usePageSize.ts`, `usePricingCatalog.ts` (catalog GET inflight-deduped), `useProductPage.ts` (list + facets in parallel, GETs inflight-deduped), `useCustomerPage.ts` (Clients list GET inflight-deduped), `useCustomerProfile.ts` (Clients profile modal related rows via BFF), `useCustomerProfileMutations.ts` (profile inquiry/comms POST via BFF), `useRegisterCustomer.ts` (BFF create/edit; store mirror under `withoutAutoSyncAsync`), `useDeleteCustomer.ts` (CRM `/api/customers` + local CASCADE; auto-sync suppressed), `useAgentPage.ts` (Agents list GET inflight-deduped; exports `fetchAgentJsonOnce` / `buildAgentPageUrl`), `useEnsureAgentsCatalogLoaded.ts` (seed from full list page or one session-memo `pageSize=96` GET), `useRegisterAgent.ts` / `useDeleteAgent.ts` (CRM `/api/agents` + store mirror; auto-sync suppressed), `useSalesPage.ts` (Sales pipeline/list GET inflight-deduped; exports `fetchLeadJsonOnce` / `buildSalesPageUrl`), `useUpdateLead.ts` / `useConfirmLead.ts` / `useApproveLeadOutline.ts` (CRM `/api/leads` + store mirror; auto-sync suppressed), `useBookingsPage.ts` / `useCreateBooking.ts` / `useUpdateBooking.ts` (Bookings BFF; optimistic update + rollback), `useEnsureCustomersCatalogLoaded.ts` (customer picker catalog via `/api/customers`), `useContractsPage.ts` / `useCreateContract.ts` / `useUpdateContract.ts` / `useDeleteContract.ts` (Contracts BFF; optimistic update/delete + rollback), `useEnsureBookingsCatalogLoaded.ts` (booking picker catalog via `/api/bookings`), `useFeedbackPage.ts` / `useCreateFeedback.ts` (Post-tour feedback BFF), `useFinancePage.ts` (Finance bundle BFF), `useTaxPage.ts` (Tax reports BFF), `useHrPage.ts` / `useSalaryPage.ts` (HR/Salary staff BFF), `useDevNotesPage.ts` / `useCreateDevNote.ts` / `useUpdateDevNote.ts` / `useDeleteDevNote.ts` (Dev Notes BFF), `useCalEventsPage.ts` / `useCreateCalEvent.ts` / `useDeleteCalEvent.ts` (Guide calendar BFF), `useGuidesPage.ts` (Guides roster GET inflight-deduped), `useSuppliersPage.ts` / `useHotelMutations.ts` / `useQuickListMutations.ts` / `useExtendedSupplierMutations.ts` (Suppliers BFF; optimistic update/delete + rollback), `useTourDesignCrmContext.ts` (Tour Design customers/leads GET inflight-deduped; refetch on mount), `useEnsureGalleryCatalogLoaded.ts` (Gallery catalog BFF for pickers), `useGalleryPage.ts` / `useUpdatePhoto.ts` / `useDeletePhoto.ts` / `usePhotoFolderMutations.ts` (Gallery page BFF), `useDashboardPage.ts` (Dashboard aggregate GET inflight-deduped by filter), `useSidebarBadges.ts` (deferred count API or store counts), `useInViewport.ts` (defer off-screen media), `useStore.ts` (re-export)

## Boundaries
- Domain logic stays in `lib/`; hooks wrap React usage only.
- `useDeleteCustomer` is BFF-first (`DELETE /api/customers/:id`); store cascade is best-effort, not required for delete to succeed.
- `useDeleteAgent` is BFF-first (`DELETE /api/agents/:id`); soft-blocks `AGT-001`.
- `useUpdateLead` / `useConfirmLead` / `useApproveLeadOutline` are BFF-first on `/sales`; store mirror is best-effort under `withoutAutoSyncAsync`.
- `useCreateBooking` / `useUpdateBooking` are BFF-first on `/bookings`; store mirror under `withoutAutoSyncAsync` with rollback on update failure.
- `useCreateContract` / `useUpdateContract` / `useDeleteContract` are BFF-first on `/contracts`; store mirror under `withoutAutoSyncAsync` with rollback on update/delete failure.
- `useFeedbackPage` / `useCreateFeedback` are BFF-first on `/posttour`; store mirror under `withoutAutoSyncAsync`.
- `useFinancePage` is BFF-first on `/finance`; mirrors finance/ar/ap under `withoutAutoSyncAsync`.
- `useTaxPage` is BFF-first on `/tax`; mirrors tax rows under `withoutAutoSyncAsync`.
- `useHrPage` / `useSalaryPage` are BFF-first on `/hr` and `/salary`; mirror staff under `withoutAutoSyncAsync`.
- `useDevNotesPage` / `useCreateDevNote` / `useUpdateDevNote` / `useDeleteDevNote` are BFF-first on `/devnotes`; optimistic create/edit/delete with rollback.
- `useCalEventsPage` / `useCreateCalEvent` / `useDeleteCalEvent` are BFF-first on Guides calendar tab; lazy load on tab mount.
- `useGuidesPage` is BFF-first on `/guides`; dedupes in-flight `GET /api/guides` (Strict Mode safe).
- Supplier mutation hooks are BFF-first on `/api/hotels|transport|restaurants|cruises|suppliers`; store mirror under `withoutAutoSyncAsync` with rollback on update/delete failure.
- Page size preference is global (`localStorage` key `crm.pageSize`); list pages should use `usePageSize` with `PaginationBar`.
