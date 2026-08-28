# BFF final cutover checklist — Split for 2 Devs

## Mục tiêu

CRM là public application duy nhất. Browser chỉ gọi CRM origin; chỉ CRM server kết nối Supabase qua private Docker network. Redis là cache tùy chọn, không phải source of truth.

Baseline kiểm tra ngày 2026-08-26:

- [x] `npm run lint` pass.
- [x] `npm run typecheck` pass.
- [x] `npm run build` pass.
- [ ] Browser bundle không còn dấu vết Supabase — hiện leakage check vẫn phát hiện `NEXT_PUBLIC_SUPABASE`, `supabase.co`, `/auth/v1` và `/storage/v1`.
- [ ] Unit test pass — hiện chạy cô lập 86 test files: 59 pass, 27 fail.
- [ ] E2E pass — hiện `npm run dev` dùng cú pháp gán env kiểu Unix nên Playwright web server không start trên Windows.

---

# Phân công tổng quan

## Dev 1 — Platform / Auth / Infra / CI

**Phạm vi sở hữu chính:**

- Server-only Supabase configuration.
- CRM-owned session.
- Production network and secrets.
- Test infrastructure và CI gates.
- Final acceptance liên quan auth, network, secrets, bundle leakage và deploy.

**Branch đề xuất:**

```text
feature/bff-cutover-platform-auth
```

## Dev 2 — Domain BFF / Browser Cutover / Storage

**Phạm vi sở hữu chính:**

- Toàn bộ domain BFF còn thiếu.
- Remove browser Supabase data stack.
- Storage và CRM-origin asset URLs.
- Domain tests, authorization, rollback và DTO boundary.
- Final acceptance liên quan domain parity, browser data stack và asset flow.

**Branch đề xuất:**

```text
feature/bff-cutover-domains
```

---

# DEV 1 CHECKLIST — Platform / Auth / Infra / CI

## D1.1 Server-only Supabase configuration

- [ ] Thay `NEXT_PUBLIC_SUPABASE_URL` bằng `SUPABASE_URL=http://supabase-ant-crm-gateway:8000`.
- [ ] Thay `NEXT_PUBLIC_SUPABASE_ANON_KEY` bằng `SUPABASE_ANON_KEY` ở runtime server.
- [ ] Xóa `NEXT_PUBLIC_USE_SUPABASE`.
- [ ] Xóa `NEXT_PUBLIC_SUPABASE_AUTO_SYNC`.
- [ ] Xóa `NEXT_PUBLIC_SUPABASE_READ_ONLY`.
- [ ] Xóa toàn bộ Supabase build args/ENV khỏi `Dockerfile`.
- [ ] Xóa toàn bộ Supabase build args khỏi `docker-compose.yml`.
- [ ] Xóa toàn bộ Supabase build args khỏi `docker-compose.local.yml`.
- [ ] Sửa `.gitlab-ci.yml` để chỉ ghi server-only variables.
- [ ] Xác nhận không đưa Supabase URL/key vào browser build.
- [ ] Sửa `.env.example` theo server-only contract.
- [ ] Sửa `scripts/validate-production-env.sh` theo server-only contract.
- [ ] Tách server env helpers sang module có `import 'server-only'`.
- [ ] Không fallback server env về `NEXT_PUBLIC_*`.
- [ ] Chuyển middleware sang server env helpers.
- [ ] Chuyển JWT/JWKS sang server env helpers.
- [ ] Chuyển health/diagnostics sang server env helpers.
- [ ] Chuyển Weather server configuration sang server env helpers.
- [ ] Chuyển Storage server configuration sang server env helpers.
- [ ] Chuyển break-glass sang server env helpers.
- [ ] Chuyển access-control sang server env helpers.
- [ ] Xóa Supabase hostname khỏi `next.config.mjs`.
- [ ] Xóa Supabase Storage remote pattern khỏi `next.config.mjs`.
- [ ] Cập nhật README theo cấu hình server-only.
- [ ] Cập nhật tài liệu setup.
- [ ] Cập nhật tài liệu database.
- [ ] Cập nhật tài liệu deployment.

### Acceptance D1.1

- [ ] Production build không cần bất kỳ `NEXT_PUBLIC_SUPABASE_*` variable nào.
- [ ] Server có thể kết nối Supabase bằng `SUPABASE_URL`.
- [ ] Browser bundle không nhận Supabase URL/key từ build env.

---

## D1.2 CRM-owned session

- [ ] Browser chỉ giữ opaque CRM session ID hoặc signed minimal CRM claims.
- [ ] Không gửi Supabase access token xuống browser.
- [ ] Không gửi Supabase refresh token xuống browser.
- [ ] Không lưu Supabase access/refresh token trong HttpOnly cookie.
- [ ] Xóa `sb-crm-access-token`.
- [ ] Dọn mọi `sb-*-auth-token` legacy cookie.
- [ ] Lưu session/token server-side trong durable source of truth.
- [ ] Redis chỉ dùng làm optional cache.
- [ ] Sửa login theo CRM session boundary.
- [ ] Sửa logout theo CRM session boundary.
- [ ] Sửa refresh theo CRM session boundary.
- [ ] Sửa revoke theo CRM session boundary.
- [ ] Sửa proxy middleware theo CRM session boundary.
- [ ] Sửa `getAuthContext` theo CRM session boundary.
- [ ] BFF server client lấy user context từ CRM session.
- [ ] Service-role path luôn kiểm tra permission trước query.
- [ ] Service-role path luôn kiểm tra permission trước mutation.

### Auth/session tests

- [ ] Login success.
- [ ] Login failure.
- [ ] Session expiry.
- [ ] Refresh success.
- [ ] Refresh failure.
- [ ] Revoke.
- [ ] Disabled account.
- [ ] Auth outage.
- [ ] JWKS outage.
- [ ] Logout cleanup.
- [ ] Legacy Supabase cookie cleanup.
- [ ] Redis-down không làm mất durable session source of truth.

---

## D1.3 Production network and secrets

- [ ] Production Compose dùng `expose` cho CRM.
- [ ] Không publish CRM port trực tiếp ra host.
- [ ] Redis production không có host `ports:` mapping.
- [ ] Supabase gateway không có host port mapping.
- [ ] Supabase Auth không có host port mapping.
- [ ] Supabase REST không có host port mapping.
- [ ] Supabase Storage không có host port mapping.
- [ ] Supabase Realtime không có host port mapping.
- [ ] Supabase Studio không có host port mapping.
- [ ] Supabase Postgres không có host port mapping.
- [ ] Chỉ reverse proxy publish `80/443`.
- [ ] Reverse proxy kết nối CRM qua private Docker network.
- [ ] CRM container resolve được `supabase-ant-crm-gateway`.
- [ ] CRM container gọi được `supabase-ant-crm-gateway:8000`.
- [ ] Browser/máy người dùng không resolve được Supabase internal hostname.
- [ ] Browser/máy người dùng không kết nối được Supabase internal service.
- [ ] Rotate anon key sau khi browser leakage đã được loại bỏ.
- [ ] Rotate service-role key nếu từng xuất hiện trong deploy/build history.
- [ ] Kiểm tra firewall.
- [ ] Kiểm tra production healthcheck.
- [ ] Kiểm tra backup.
- [ ] Kiểm tra restore.
- [ ] Viết/kiểm tra rollback runbook.

### Acceptance D1.3

- [ ] `docker compose ps` xác nhận chỉ reverse proxy publish public ports.
- [ ] CRM → Supabase private gateway: PASS.
- [ ] Browser/host external → Supabase internal services: BLOCKED.
- [ ] Redis không public port.
- [ ] Postgres không public port.

---

## D1.4 Test infrastructure and CI gates

- [ ] Sửa `npm test` để chạy cross-platform.
- [ ] `npm test` không phụ thuộc `find`.
- [ ] `npm test` không phụ thuộc `/dev/null`.
- [ ] Sửa `npm run dev` để `NODE_OPTIONS` chạy trên Windows.
- [ ] Sửa `npm run dev` để `NODE_OPTIONS` chạy trên Linux.
- [ ] Sửa Playwright web server để start được trên Windows.
- [ ] Sửa test infrastructure cho BFF/auth request context.
- [ ] Sửa các test gọi `cookies()` ngoài request scope.
- [ ] Dùng `scripts/check-supabase-leakage.mjs` làm leakage command cross-platform.
- [ ] Thêm leakage check vào Docker verifier.
- [ ] Thêm leakage check vào GitLab CI sau production build.
- [ ] CI bắt buộc `npm run lint`.
- [ ] CI bắt buộc `npm run typecheck`.
- [ ] CI bắt buộc `npm test`.
- [ ] CI bắt buộc `npm run build`.
- [ ] CI bắt buộc Supabase leakage check.
- [ ] Test Redis-down.
- [ ] Test Supabase-down.
- [ ] Supabase-down trả lỗi phù hợp.
- [ ] Supabase-down có structured log.
- [ ] Supabase-down có request ID.

### Dev 1 chịu trách nhiệm sửa các test fail thuộc

- [ ] Auth.
- [ ] Middleware.
- [ ] Session.
- [ ] Request context.
- [ ] `cookies()`.
- [ ] Env.
- [ ] CI/test infrastructure.

> Test fail thuộc domain business cụ thể giao Dev 2.

---

# DEV 2 CHECKLIST — Domain BFF / Browser Cutover / Storage

## D2.1 Chuẩn vertical slice bắt buộc cho mỗi domain

Mỗi domain chỉ được đánh dấu DONE khi đủ toàn bộ:

- [ ] Zod request contract.
- [ ] Zod response contract nếu cần.
- [ ] Request DTO.
- [ ] Response DTO tối thiểu.
- [ ] Pure row mapper.
- [ ] Repository server-only.
- [ ] Service/domain layer nếu domain có business logic.
- [ ] Authentication check.
- [ ] Permission check.
- [ ] Object-level authorization.
- [ ] API read route.
- [ ] API mutation route.
- [ ] UI fetcher.
- [ ] UI hook/query.
- [ ] Mutation qua BFF.
- [ ] Optimistic update nếu có.
- [ ] Mutation rollback khi API fail.
- [ ] Cache invalidation/revalidation.
- [ ] Test `401`.
- [ ] Test `403`.
- [ ] Test invalid input.
- [ ] Test success.
- [ ] Test object-level authorization.
- [ ] Test optimistic rollback.
- [ ] API không trả raw Supabase row.
- [ ] API không trả sensitive/internal fields.
- [ ] Domain không còn phụ thuộc generic auto-sync cho write.

**Domains đã đạt D2.1 (theo checklist riêng bên dưới):**

- [x] Bookings — đủ slice UI hiện tại; chi tiết D2.2 (2026-08-27). `DELETE` API deferred vì UI không có xóa booking.
- [x] Contracts — đủ slice UI hiện tại; chi tiết D2.3 (2026-08-27). `DELETE`/archive deferred vì UI không có.
- [x] Suppliers — đủ slice UI hiện tại (Hotels+rooms, Transport, Restaurants, Cruises, Extended); chi tiết D2.4 (2026-08-27).

---

## D2.2 Bookings — PRIORITY 1

Hiện trạng cần loại bỏ:

```text
UI
  -> Zustand mutation
  -> generic auto-sync
```

Target:

```text
UI
  -> /api/bookings
  -> permission
  -> booking repository
  -> Supabase server-only
```

Checklist:

- [x] Tạo Zod contract cho Bookings.
- [x] Tạo Booking DTO.
- [x] Tạo Booking mapper.
- [x] Tạo Bookings repository server-only.
- [x] Tạo `GET /api/bookings`.
- [x] Tạo `POST /api/bookings`.
- [x] Tạo `PATCH /api/bookings/[id]` hoặc equivalent.
- [ ] Tạo `DELETE /api/bookings/[id]` hoặc equivalent. *(UI không có delete — deferred)*
- [x] Thêm auth check.
- [x] Thêm permission check.
- [x] Thêm object-level authorization.
- [x] Chuyển booking reads khỏi direct hydrate.
- [x] Chuyển booking mutations khỏi Zustand → auto-sync.
- [x] UI dùng BFF fetcher/hook.
- [x] Mutation có rollback.
- [x] Mutation có cache invalidation.
- [x] Test `401`.
- [x] Test `403`.
- [x] Test invalid input.
- [x] Test success.
- [x] Test object-level authorization.
- [x] Test optimistic rollback.
- [x] Xác nhận `bookings` không còn generic direct sync.

---

## D2.3 Contracts

- [x] Hoàn thành full vertical slice cho Contracts.
- [x] Read qua BFF.
- [x] Create qua BFF.
- [x] Update qua BFF.
- [ ] Delete/archive qua BFF nếu có. *(UI không có delete/archive — deferred)*
- [x] Permission + object authorization.
- [x] DTO tối thiểu.
- [x] Rollback + cache invalidation.
- [x] Tests đầy đủ.
- [x] Không generic auto-sync.

---

## D2.4 Suppliers

### Hotels

- [x] Hoàn thành full vertical slice Hotels.

### Hotel Rooms

- [x] Hoàn thành full vertical slice Hotel Rooms.

### Transport

- [x] Hoàn thành full vertical slice Transport.

### Restaurants

- [x] Hoàn thành full vertical slice Restaurants.

### Cruises

- [x] Hoàn thành full vertical slice Cruises.

### Extended suppliers

- [x] Audit toàn bộ extended supplier types.
- [x] Hoàn thành BFF cho từng supplier type còn thiếu.
- [x] Dùng shared supplier primitives nếu phù hợp.
- [x] Không tạo API generic trả raw supplier DB rows.

---

## D2.5 Post-tour / Feedback

- [ ] Hoàn thành full vertical slice Post-tour.
- [ ] Hoàn thành full vertical slice Feedback.
- [ ] Authorization theo booking/tour/user ownership nếu có.
- [ ] Không browser direct Supabase.

---

## D2.6 Finance / AR / AP

- [ ] Hoàn thành Finance BFF.
- [ ] Hoàn thành Accounts Receivable BFF.
- [ ] Hoàn thành Accounts Payable BFF.
- [ ] DTO không leak internal finance fields ngoài nhu cầu UI.
- [ ] Permission theo role.
- [ ] Object-level authorization.
- [ ] Mutation rollback.
- [ ] Tests.

---

## D2.7 Tax Reports

- [ ] Hoàn thành Tax Reports BFF.
- [ ] Read/filter/export qua CRM server.
- [ ] Không browser query trực tiếp Supabase.
- [ ] Permission.
- [ ] DTO boundary.
- [ ] Tests.

---

## D2.8 HR / Salary / Staff

- [ ] Hoàn thành HR BFF.
- [ ] Hoàn thành Salary BFF.
- [ ] Hoàn thành Staff BFF.
- [ ] Không trả salary/sensitive fields nếu UI không cần.
- [ ] Kiểm tra role permission nghiêm ngặt.
- [ ] Object-level authorization.
- [ ] Tests.

---

## D2.9 Dev Notes

- [ ] Hoàn thành Dev Notes BFF.
- [ ] Read qua BFF.
- [ ] Mutation qua BFF.
- [ ] Permission.
- [ ] DTO.
- [ ] Rollback/cache invalidation.
- [ ] Tests.

---

## D2.10 Guide Calendar / `cal_events`

- [ ] Hoàn thành Guide Calendar BFF.
- [ ] Chuyển `cal_events` reads sang BFF.
- [ ] Chuyển `cal_events` writes sang BFF.
- [ ] Permission.
- [ ] Object-level authorization.
- [ ] DTO.
- [ ] Rollback/cache invalidation.
- [ ] Tests.

---

## D2.11 Team Chat

### `chat_messages`

- [ ] Hoàn thành read BFF.
- [ ] Hoàn thành create mutation.
- [ ] Hoàn thành update/delete nếu được hỗ trợ.
- [ ] Permission.
- [ ] Object-level authorization.
- [ ] DTO.
- [ ] Tests.

### `chat_reactions`

- [ ] Hoàn thành read BFF.
- [ ] Hoàn thành add/remove reaction.
- [ ] Permission.
- [ ] Object-level authorization.
- [ ] DTO.
- [ ] Optimistic rollback.
- [ ] Tests.

---

## D2.12 Cross-domain mutation audit

- [ ] Audit mọi Zustand mutation.
- [ ] Xác định mutation nào đang chờ generic auto-sync.
- [ ] Chuyển mọi business mutation sang BFF.
- [ ] Không domain nào vừa BFF write vừa generic direct sync.
- [ ] Audit mọi API response.
- [ ] Không API nào trả raw Supabase rows.
- [ ] Không API nào trả sensitive fields không cần thiết.

---

## D2.13 Remove browser Supabase data stack

> Chỉ thực hiện khi toàn bộ domain BFF phía trên đã đạt parity.

### Browser Supabase client

- [ ] Xóa `lib/supabase/client.ts`.
- [ ] Xóa browser singleton trong `lib/supabase/index.ts`.
- [ ] Xác nhận production source không còn `createBrowserClient`.

### Browser Supabase I/O

- [ ] Xóa/retire browser I/O trong `lib/db/supabase/**`.
- [ ] Giữ pure row mappers nếu server repository còn sử dụng.
- [ ] Không browser import `lib/db/supabase`.

### Hydrate stack

- [ ] Xóa/retire `lib/db/hydrate/**`.
- [ ] Xóa/retire `lib/db/hydrate.ts`.
- [ ] Xóa route hydrate configuration.
- [ ] Xóa shell hydrate configuration.

### Auto-sync stack

- [ ] Xóa/retire `lib/db/auto-sync.ts`.
- [ ] Xóa/retire `sync-push.ts`.
- [ ] Xóa/retire `remote-delete.ts`.
- [ ] Xóa sync lifecycle.

### UI lifecycle/components

- [ ] Gỡ `AutoSyncListener`.
- [ ] Gỡ `PageDataGate`.
- [ ] Gỡ Supabase context.
- [ ] Gỡ migration controls khỏi `StoreProvider`/Topbar.
- [ ] Gỡ push controls khỏi `StoreProvider`/Topbar.

### Zustand boundary

- [ ] Zustand chỉ dùng cho UI state.
- [ ] Zustand chỉ dùng cho local cache khi phù hợp.
- [ ] Zustand chỉ dùng cho optimistic state khi phù hợp.
- [ ] Zustand không còn là full database replica.

### Acceptance D2.13

- [ ] Không còn `createBrowserClient`.
- [ ] Không browser import `lib/db/supabase`.
- [ ] Không browser hydrate từ Supabase.
- [ ] Không generic auto-sync.
- [ ] Không direct browser mutation vào Supabase.

---

## D2.14 Storage và asset URLs

Target:

```text
Browser
  -> CRM-origin asset endpoint
  -> CRM server
  -> Supabase Storage private network
```

### Asset URL rules

- [ ] Mọi ảnh browser dùng CRM-origin URL.
- [ ] Không trả `*.supabase.co/storage/v1/...`.
- [ ] Không trả `supabase-ant-crm-gateway:8000`.
- [ ] Không trả internal Supabase hostname.

### Company logo

- [ ] Thêm CRM asset endpoint cho company logo.
- [ ] `/api/branding/logo` không trả raw Supabase public URL.
- [ ] Logo được stream/proxy hoặc resolve qua CRM-origin URL.

### DTO photo normalization

- [ ] Gallery photo DTO dùng CRM asset URL.
- [ ] Product photo DTO dùng CRM asset URL.
- [ ] Attraction photo DTO dùng CRM asset URL.
- [ ] Guide photo DTO dùng CRM asset URL.
- [ ] Weather photo DTO dùng CRM asset URL.
- [ ] Proposal photo DTO dùng CRM asset URL.

### `storage-image-src.ts`

- [ ] Không đọc Supabase public env.
- [ ] Không tạo direct Supabase browser URL.
- [ ] Chỉ cho phép CRM-origin asset URL.

### Asset tests

- [ ] Unauthenticated asset access.
- [ ] Forbidden asset access.
- [ ] Invalid path.
- [ ] Missing object.
- [ ] Correct content type.
- [ ] Cache headers.
- [ ] Không leak Supabase URL trong response/header.

---

# SHARED CHECKLIST — Hai Dev cùng chịu trách nhiệm

## S1. Boundary/module ownership

### Dev 1 sở hữu

```text
lib/server/env/**
lib/server/auth/**
lib/server/session/**
lib/server/permissions/**   # core permission infrastructure
middleware/proxy auth boundary
Docker / Compose
GitLab CI
test infrastructure
```

### Dev 2 sở hữu

```text
lib/domains/**
app/api/<domain>/**
features/<domain>/**
domain DTOs
domain repositories
domain tests
asset BFF endpoints
```

### Shared rules

- [ ] Dev 2 không tự tạo auth/session implementation riêng trong từng domain.
- [ ] Dev 2 dùng `getAuthContext`/permission infrastructure do Dev 1 cung cấp.
- [ ] Dev 1 không thay đổi domain response contracts nếu không phối hợp với Dev 2.
- [ ] Server Supabase client chỉ tồn tại ở server-only boundary.
- [ ] Không import server-only module vào Client Component.

---

# MERGE / EXECUTION ORDER

## Phase 1 — Foundation

### Dev 1

- [ ] Hoàn thành server-only env helper.
- [ ] Hoàn thành server Supabase client boundary.
- [ ] Hoàn thành auth/session interface cơ bản.
- [ ] Hoàn thành permission context cơ bản.

### Dev 2

- [x] Audit Bookings.
- [x] Chuẩn hóa pattern vertical slice.
- [x] Chuẩn bị DTO/repository/API structure.

**Gate:**

- [ ] Dev 2 có thể dùng ổn định auth/session/server client boundary của Dev 1.

---

## Phase 2 — Domain migration

Dev 2 thực hiện theo thứ tự:

- [x] Bookings.
- [x] Contracts.
- [x] Suppliers.
- [ ] Guide Calendar.
- [ ] Post-tour / Feedback.
- [ ] Finance / AR / AP.
- [ ] Tax Reports.
- [ ] HR / Salary / Staff.
- [ ] Dev Notes.
- [ ] Team Chat.

Song song Dev 1:

- [ ] CRM-owned session.
- [ ] Cross-platform tests.
- [ ] CI leakage gate.
- [ ] Docker/network hardening.

---

## Phase 3 — Browser Supabase removal

Chỉ bắt đầu khi:

- [x] Bookings đạt parity.
- [x] Contracts đạt parity.
- [x] Suppliers đạt parity.
- [ ] Post-tour / Feedback đạt parity.
- [ ] Finance / AR / AP đạt parity.
- [ ] Tax Reports đạt parity.
- [ ] HR / Salary / Staff đạt parity.
- [ ] Dev Notes đạt parity.
- [ ] Guide Calendar đạt parity.
- [ ] Team Chat đạt parity.

Sau đó Dev 2:

- [ ] Remove browser Supabase client.
- [ ] Remove hydrate.
- [ ] Remove auto-sync.
- [ ] Remove direct browser storage URLs.

---

## Phase 4 — Production cutover

### Dev 1

- [ ] Apply private network isolation.
- [ ] Remove public service ports.
- [ ] Rotate keys.
- [ ] Run deploy/rollback verification.

### Dev 2

- [ ] Run full domain Playwright.
- [ ] Verify asset CRM-origin URLs.
- [ ] Verify no domain direct sync.

---

# FINAL ACCEPTANCE

## A. Browser boundary

**Owner: Dev 1 + Dev 2**

- [ ] Browser DevTools Fetch chỉ gọi CRM origin.
- [ ] Browser DevTools XHR chỉ gọi CRM origin.
- [ ] Browser WebSocket chỉ gọi CRM origin.
- [ ] Browser cookies không chứa Supabase token.
- [ ] Browser cookies không chứa Supabase key.
- [ ] Browser localStorage không chứa Supabase token/key/URL.
- [ ] Browser sessionStorage không chứa Supabase token/key/URL.
- [ ] Chặn outbound browser access tới Supabase không ảnh hưởng CRM.

---

## B. Production bundle leakage

**Owner: Dev 1**

- [ ] `.next/static` không chứa Supabase hostname.
- [ ] `.next/static` không chứa Supabase key.
- [ ] `.next/static` không chứa `NEXT_PUBLIC_SUPABASE`.
- [ ] `.next/static` không chứa `/auth/v1`.
- [ ] `.next/static` không chứa `/rest/v1`.
- [ ] `.next/static` không chứa `/storage/v1`.
- [ ] `.next/static` không chứa `/realtime/v1`.

---

## C. Domain cutover

**Owner: Dev 2**

- [ ] Không domain nào dùng browser Supabase client.
- [ ] Không domain nào hydrate trực tiếp từ Supabase.
- [ ] Không domain nào ghi Zustand rồi chờ generic auto-sync.
- [ ] Không domain nào chạy đồng thời BFF write và generic direct sync.
- [ ] Mọi API trả DTO tối thiểu.
- [ ] Không API trả raw Supabase rows.
- [ ] Không API leak sensitive fields.
- [ ] Mọi mutation quan trọng có rollback.
- [ ] Mọi mutation quan trọng có cache invalidation.

---

## D. Session boundary

**Owner: Dev 1**

- [ ] Browser chỉ giữ CRM session.
- [ ] Không Supabase access token trong browser.
- [ ] Không Supabase refresh token trong browser.
- [ ] Không Supabase auth legacy cookie.
- [ ] Session source of truth là durable server-side store.
- [ ] Redis chỉ là optional cache.
- [ ] Revoke hoạt động.
- [ ] Disabled account bị chặn.
- [ ] Logout cleanup đầy đủ.

---

## E. Storage

**Owner: Dev 2**

- [ ] Mọi asset browser dùng CRM-origin URL.
- [ ] Không browser URL chứa Supabase Storage hostname.
- [ ] Company logo đi qua CRM asset endpoint.
- [ ] Gallery/Product/Attraction/Guide/Weather/Proposal đều dùng CRM asset URLs.
- [ ] Asset authorization hoạt động.
- [ ] Asset cache headers đúng.

---

## F. Production network

**Owner: Dev 1**

- [ ] `docker compose ps` xác nhận chỉ reverse proxy publish public ports.
- [ ] CRM không publish host port.
- [ ] Redis không publish host port.
- [ ] Supabase gateway không publish host port.
- [ ] Supabase services không publish host port.
- [ ] Postgres không publish host port.
- [ ] CRM resolve được `supabase-ant-crm-gateway:8000`.
- [ ] Browser không resolve/kết nối Supabase internal hostname.

---

## G. Test gates

**Owner: Shared**

- [ ] `npm run lint` pass.
- [ ] `npm run typecheck` pass.
- [ ] `npm test` pass.
- [ ] `npm run build` pass.
- [ ] Supabase leakage check pass.
- [ ] Playwright login pass.
- [ ] Playwright Bookings pass.
- [ ] Playwright Contracts pass.
- [ ] Playwright Suppliers pass.
- [ ] Playwright Post-tour/Feedback pass.
- [ ] Playwright Finance/AR/AP pass.
- [ ] Playwright Tax Reports pass.
- [ ] Playwright HR/Salary/Staff pass.
- [ ] Playwright Dev Notes pass.
- [ ] Playwright Guide Calendar pass.
- [ ] Playwright Team Chat pass.
- [ ] Redis-down test pass.
- [ ] Supabase-down test pass.

---

## H. Documentation / Ops sign-off

**Owner: Shared + Owner/Ops**

- [ ] Cập nhật `BFF-TASKS.md`.
- [ ] Cập nhật `BFF-TASKS-vi.md`.
- [ ] Cập nhật current-system documentation.
- [ ] Cập nhật deployment documentation.
- [ ] Cập nhật rollback runbook.
- [ ] Owner/Ops xác nhận network isolation.
- [ ] Owner/Ops xác nhận key rotation.
- [ ] Owner/Ops xác nhận deployment.
- [ ] Owner/Ops xác nhận rollback.

---

# Definition of Done

Cutover chỉ được đánh dấu **DONE** khi tất cả điều kiện sau cùng đúng:

- [ ] CRM là public application duy nhất.
- [ ] Browser chỉ gọi CRM origin.
- [ ] Supabase chỉ được CRM server gọi qua private Docker network.
- [ ] Browser không chứa Supabase URL/key/token.
- [ ] Browser production bundle không chứa Supabase endpoints.
- [ ] Không còn browser Supabase client.
- [ ] Không còn generic hydrate/direct sync cho business data.
- [ ] Tất cả domain chính đã chuyển sang permissioned BFF.
- [ ] Redis-down không làm mất khả năng đọc/ghi source of truth.
- [ ] Supabase-down fail safely.
- [ ] Chỉ reverse proxy publish `80/443`.
- [ ] Lint pass.
- [ ] Typecheck pass.
- [ ] Unit test pass.
- [ ] Production build pass.
- [ ] Leakage check pass.
- [ ] Playwright pass.
- [ ] Documentation cập nhật.
- [ ] Owner/Ops sign-off.
