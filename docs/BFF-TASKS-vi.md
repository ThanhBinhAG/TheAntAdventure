# Phân chia công việc BFF cho 2 Developer

## Mục tiêu

Browser chỉ gọi CRM HTTPS. Supabase, Postgres và Redis không có public port; chỉ CRM container gọi Supabase qua private Docker network. Redis lỗi chỉ làm mất cache, không làm CRM ngừng hoạt động.

## Điều kiện đầu vào — Bạn/Owner-Ops phụ trách

Hai developer chỉ bắt đầu feature sau khi bạn bàn giao môi trường:

- [ ] CRM, Redis, Supabase gateway, Auth, Storage, Realtime, Studio và Postgres cùng private Docker network.
- [ ] Chỉ reverse proxy mở `80`/`443`; CRM, Redis, Supabase và Postgres không có `ports:` ra host.
- [ ] Runtime secret và hostname nội bộ: `SUPABASE_URL`, key server-side, `REDIS_URL`, CRM dev URL.
- [ ] Xác nhận CRM container gọi được Supabase nội bộ, browser không resolve/kết nối được Supabase.
- [ ] Cấu hình reverse proxy, firewall, health check và cách deploy/rollback.

## Phạm vi ưu tiên đợt 1

Chỉ thực hiện 9 feature dưới đây. Các feature CRM khác được hoãn để không làm nở phạm vi.

| Feature | Owner | Deliverable trọn vẹn |
|---|---|---|
| Auth & Session | Developer A | Login/logout, CRM HttpOnly session, refresh/revoke, middleware, permission enforcement, test |
| Daily Planner | Developer A | Repository/API, quyền, UI/hook, test, gỡ direct Supabase path |
| Attraction Schedule | Developer A | Địa điểm theo tỉnh, API lịch/địa điểm, UI/hook, test, gỡ direct path |
| Tour Design | Developer A | Draft/outline API, ghi dữ liệu con an toàn, UI/hook, test, gỡ direct path |
| Tour Product | Developer A | Product/pricing API, Redis cache, UI/hook, test, gỡ direct path |
| Clients | Developer B | Customer API, search/pagination, UI/hook, test, gỡ direct path |
| B2B Agents | Developer B | Agent API, UI/hook, test, gỡ direct path |
| Sales Pipeline | Developer B | Lead/pipeline API, UI/hook, test, gỡ direct path |
| Photo Gallery | Developer B | Metadata, upload/delete API CRM, UI/hook, test, gỡ direct path |
| Weather Guide | Developer B | API đọc/refresh thời tiết, UI/hook, test, gỡ direct path |

## Quy tắc

1. **Một feature, một owner.** Owner làm repository/API, phân quyền, cache invalidation (nếu có), UI caller, test và direct-path removal. Developer còn lại review feature hoàn chỉnh.
2. **API contract trước.** Owner gửi Zod schema, DTO response và lỗi trước khi làm UI; developer kia review contract.
3. **Một feature, một pull request.** PR gồm API/repository, quyền, UI caller, cache, test và checklist browser Network.
4. Không tạo generic `/api/supabase/*`; chỉ tạo API theo nghiệp vụ.
5. Không dùng service role mặc định. BFF phải xác thực CRM session và kiểm tra quyền trước mọi thao tác.
6. Không xóa sync cũ dùng chung đến khi cả 9 feature đạt parity.

## Việc chung trước feature

| Task | Owner chính | Hoàn thành khi |
|---|---|---|
| Ghi nhận baseline Network | A | Có capture login, dashboard và 9 feature hiện tại |
| Inventory direct Supabase imports | B | **Clients/Agents/Sales/Gallery done**; còn Weather |
| Server-only Supabase client + BFF helper | A | `lib/supabase/server.ts`, auth/permission/error primitives sẵn sàng |
| CRM-owned HttpOnly session | A | Browser không giữ Supabase token |
| Shared DTO/test fixtures | B | Feature owner có contract và test fixture dùng chung — **Customers Zod + fixtures: done** (`customer-list-input.ts`, `Personal/tests/customer-*.test.ts`) |
| Redis helper/cache policy | A | Cache-aside, TTL và invalidation; Redis-down không fail API |
| CI leakage check | B | Build fail nếu browser bundle có hostname/key/path Supabase — **script added** (`npm run check:supabase-leakage`); hard-fail CI sau khi hết browser Supabase path |

## Developer A — feature end-to-end

### A0 — Auth & Session

- [x] Hoàn thiện login/logout, CRM HttpOnly session, session validation, refresh và revoke.
- [x] Chuyển middleware redirect và permission enforcement hoàn toàn về CRM BFF.
- [x] Browser không giữ Supabase access/refresh token; không gọi Supabase Auth trực tiếp.
- [x] Test unauthenticated, login fail/success, logout, session expiry, revoke và forbidden permission.

### A1 — Tour Product

- [x] API/repository Products và Pricing; filter, sort, pagination ở server.
- [x] Redis cache Product list/facets; invalidate sau product/pricing mutation.
- [x] Chuyển UI/hook sang CRM API, optimistic update và error state.
- [x] Test quyền, cache invalidation, UI parity; gỡ direct browser-Supabase path.

### A2 — Daily Planner

- [x] API/repository dữ liệu planner và mutation liên quan.
- [x] Chuyển UI/hook sang CRM API; kiểm tra quyền và rollback khi mutation lỗi.
- [x] Test parity; gỡ direct browser-Supabase path.

### A3 — Attraction Schedule

- [x] API/repository địa điểm tham quan và lịch theo tỉnh.
- [x] Chuyển UI/hook, filter theo tỉnh và mutation sang CRM API.
- [x] Test quyền, dữ liệu theo tỉnh, UI parity; gỡ direct browser-Supabase path.

### A4 — Tour Design

- [x] API/repository aggregate cho Tour Draft, Outline và child records.
- [x] Đảm bảo ghi nhiều bảng transaction hoặc rollback an toàn.
- [x] Chuyển UI/hook, test permission/mutation rollback; gỡ direct browser-Supabase path.

## Developer B — feature end-to-end

### B1 — Clients

- [x] Customer API/repository cho list/detail/create/update/delete.
- [x] Search/pagination ở server; chuyển UI/hook và optimistic update.
- [x] Test quyền, filter, UI parity; gỡ direct browser-Supabase path.

> **Done 2026-08-21 (DEV B):** `/api/customers` + repo Zod, `useCustomerPage` / register / delete, contract tests, Network filter B2B → CRM API. Notes qua `PATCH`. Hydrate/shared sync `customers` vẫn còn cho route khác (quy tắc #6 — chưa xóa sync chung). Comms / new inquiry profile để B3. Inventory callers: `Personal/docs/bff-customers-inventory.md`. CI script: `npm run check:supabase-leakage` (chưa hard-fail build tới cutover).

### B2 — B2B Agents

- [x] Agent API/repository, UI/hook và permission test.
- [x] Gỡ direct browser-Supabase path.

> **Done 2026-08-23 (DEV B):** `/api/agents` + Zod/repo, `useAgentPage` / register / delete, contract tests. Notes via form PATCH. Hydrate/shared sync `agents` retained for dashboard/customers (rule #6). Inventory: `Personal/docs/bff-agents-inventory.md`. Network checklist: `Personal/docs/bff-agents-network-checklist.md`.

### B3 — Sales Pipeline

- [x] Lead/pipeline API/repository, UI/hook và permission test.
- [x] Test luồng chuyển stage, lỗi validation và UI parity.
- [x] Gỡ direct browser-Supabase path.

> **Done 2026-08-24 (DEV B):** `/api/leads` + Zod/repo, `useSalesPage` / `useUpdateLead` / `useConfirmLead` / `useApproveLeadOutline`, contract tests. Register Lead stays `/api/customers`. `PAGE_BOOT_TABLES.sales: []`; `leads`/`comms`/`bookings` in BFF denylist. Inventory: `Personal/docs/bff-sales-inventory.md`. Network checklist: `Personal/docs/bff-sales-network-checklist.md`.

### B4 — Photo Gallery

- [x] Duy trì upload qua `/api/photos/upload/*`; bảo đảm metadata và delete cũng qua CRM API.
- [x] Hoàn thiện repository/API, UI/hook, permission test.
- [x] Browser chỉ upload/call CRM origin; gỡ direct Storage/Supabase path.

> **Done 2026-08-24 (DEV B):** `GET /api/photos`, `PATCH /api/photos/[id]`, `/api/photo-folders` CRUD; upload routes + `gallery.write`; hooks `useGalleryPage`, `useUpdatePhoto`, `useDeletePhoto`, `usePhotoFolderMutations`, `useEnsureGalleryCatalogLoaded`; `PAGE_BOOT_TABLES.gallery: []`; inventory/checklist `Personal/docs/bff-gallery-*`; contract tests `tests/gallery-bff.test.ts`.

### B5 — Weather Guide

- [ ] Weather read/refresh API/repository; refresh phải có quyền riêng.
- [ ] Chuyển UI/hook, test refresh failure và UI parity.
- [ ] Gỡ direct browser-Supabase path.

### Dashboard BFF (ngoài 9 feature gốc — theo `BFF-REFACTOR-PLAN`)

- [x] Aggregate `GET /api/dashboard` + `dashboard.read`; metrics server-side; Redis cache-aside.
- [x] UI/hook; `PAGE_BOOT_TABLES.dashboard: []`; gỡ PostgREST hydrate trên `/dashboard`.

> **Done 2026-08-24 (DEV B):** [`/api/dashboard`](app/api/dashboard/route.ts), [`useDashboardPage`](hooks/useDashboardPage.ts), [`dashboard-repository.ts`](lib/dashboard/dashboard-repository.ts); inventory/checklist `Personal/docs/bff-dashboard-*`; contract tests [`tests/dashboard-bff.test.ts`](tests/dashboard-bff.test.ts). Lead writes invalidate dashboard cache. Shared hydrate retained for other routes (rule #6).

## Thứ tự làm song song

| Đợt | Developer A | Developer B | Checkpoint |
|---|---|---|---|
| 0 | Việc chung + Tour Product | Việc chung + Clients | Contract, private env và CI leakage check pass |
| 1 | Daily Planner | B2B Agents | DevTools chỉ gọi CRM ở feature đã xong |
| 2 | Attraction Schedule | Sales Pipeline | Permission, parity và rollback tests pass |
| 3 | Tour Design | Photo Gallery | Không còn direct Supabase request ở hai feature |
| 4 | Review/cutover support | Weather Guide | Cả 9 feature pass acceptance |

## Test gate mỗi feature

```bash
npm run lint
npm run typecheck
npm run build
```

Trước merge feature, owner xác nhận:

- [ ] Browser DevTools Network chỉ có request đến CRM origin.
- [ ] Browser bundle không có URL, key, `/auth/v1`, `/rest/v1` hoặc `/storage/v1` của Supabase.
- [ ] Test unauthenticated, unauthorized, invalid input, success và Redis-down (nếu feature dùng cache).
- [ ] Supabase write thành công trước khi invalidate Redis.
- [ ] Feature không dùng đồng thời direct sync cũ và BFF write trong production.

## Cutover cuối

- [ ] Inventory direct Supabase imports của 9 feature bằng 0.
- [ ] Gỡ browser client, `NEXT_PUBLIC_SUPABASE_*` và generic hydrate/auto-sync chỉ sau khi 9 feature parity pass.
- [ ] Owner-Ops rotate key, xác nhận không public port và kiểm tra firewall.
- [ ] Browser acceptance cuối: không có request/WebSocket/token Supabase.
