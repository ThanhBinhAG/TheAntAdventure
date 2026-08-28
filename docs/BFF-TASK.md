# BFF final cutover checklist — Split for 2 Devs

## Mục tiêu

CRM là public application duy nhất. Browser chỉ gọi CRM origin; chỉ CRM server kết nối Supabase qua private Docker network. Redis là cache tùy chọn, không phải source of truth.

Baseline ban đầu ngày 2026-08-26; đối soát local gần nhất ngày 2026-08-28:

- [x] `npm run lint` pass.
- [x] `npm run typecheck` pass.
- [x] `npm run build` pass.
- [ ] Browser bundle không còn dấu vết Supabase — local hard leakage check chỉ còn phát hiện `/storage/v1`; đây là dependency Dev 2 tại `lib/gallery/storage-image-src.ts`.
- [x] Unit test pass — `npm test` pass 254/259 tests, 5 skipped, 0 failed (2026-08-28).
- [ ] E2E pass — E2E lifecycle với Supabase test database riêng chưa được chạy; launcher đa nền tảng đã thay thế cú pháp gán env kiểu Unix cũ.

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

> Last reconciled: 2026-08-28. `[x]` means the source/configuration and its
> local regression coverage are complete. Items requiring a deployment target,
> a Windows/GitLab runner, or Dev 2 browser cutover remain unchecked.

## D1.1 Server-only Supabase configuration

- [x] Server runtime dùng `SUPABASE_URL` / `SUPABASE_ANON_KEY`; deploy CI đặt gateway nội bộ `http://supabase-ant-crm-gateway:8000`.
- [x] `lib/server/env/supabase.ts` là server-only boundary; server callers không fallback về `NEXT_PUBLIC_*`.
- [x] Browser compatibility boundary tắt generic Supabase hydrate/sync/read-only flags.
- [x] Không còn Supabase build args/ENV trong Dockerfile hoặc hai Compose files.
- [x] `.env.example`, deployment CI và production-env validator dùng server-only contract.
- [x] JWT/JWKS, middleware/proxy, health/diagnostics, weather, storage, break-glass và Access Control đã chuyển sang server env helpers.
- [x] `next.config.mjs` không còn Supabase hostname hay Storage remote pattern.
- [x] README và session-operation document phản ánh server-only/durable-session boundary.
- [x] Cập nhật `docs/SUPABASE-SETUP.md` và `docs/CURRENT-SYSTEM.md` theo server-only config, durable CRM session và private-network boundary.
- [ ] Xóa hit `/storage/v1` còn lại trong browser bundle — dependency Dev 2 (`lib/gallery/storage-image-src.ts`).

### Acceptance D1.1

- [x] Production build không cần bất kỳ `NEXT_PUBLIC_SUPABASE_*` variable nào.
- [x] Server configuration and CI deploy use `SUPABASE_URL` at runtime only.
- [x] Browser bundle không nhận Supabase URL/key từ build env.
- [ ] Final browser leakage check passes after Dev 2 storage cutover.

---

## D1.2 CRM-owned session

- [x] Browser chỉ nhận opaque HttpOnly `crm_session`; Supabase access/refresh tokens không được trả, lưu cookie, storage hoặc log.
- [x] Durable `crm_sessions` stores hash opaque token and AES-GCM encrypted server credentials; Redis không là source of truth.
- [x] Login, refresh (atomic rotation), logout/revoke, Proxy và `getAuthContext` dùng CRM session boundary.
- [x] Legacy `sb-crm-access-token` và `sb-*-auth-token` được dọn khi gặp.
- [x] BFF user-scoped client chỉ nhận verified CRM auth context; disable account ban Auth và revoke all durable sessions.
- [x] Có host job `npm run session:cleanup` để cleanup không phụ thuộc login traffic.
- [ ] Apply migration `20260827104813_durable_crm_sessions_v2.sql` ở staging/production.
- [ ] Kiểm tra login/refresh/logout/revoke/disable trên Supabase Auth và Postgres thật.

### Auth/session tests

- [x] Unit tests: login success/failure, refresh success/failure, logout, revoke, disabled account, legacy-cookie cleanup, JWT/JWKS outage và Redis graceful degradation.
- [x] E2E contract now asserts opaque `crm_session`, never a retired Supabase cookie.
- [ ] E2E login/session lifecycle against a dedicated test Supabase instance (`E2E_ALLOW_DATABASE_MUTATION=1`).

---

## D1.3 Production network and secrets

> Phase 4 source controls are implemented. `docker-compose.yml` is the
> private production topology; `docker-compose.local.yml` intentionally keeps
> CRM `3006` and Redis `127.0.0.1:6379` for local development.

- [x] Production Compose dùng `expose` cho CRM.
- [x] Không publish CRM port trực tiếp ra host.
- [x] Redis production không có host `ports:` mapping.
- [ ] Supabase gateway không có host port mapping.
- [ ] Supabase Auth không có host port mapping.
- [ ] Supabase REST không có host port mapping.
- [ ] Supabase Storage không có host port mapping.
- [ ] Supabase Realtime không có host port mapping.
- [ ] Supabase Studio không có host port mapping.
- [ ] Supabase Postgres không có host port mapping.
- [ ] Chỉ reverse proxy publish `80/443`.
- [x] Production Compose yêu cầu reverse proxy qua external `CRM_PROXY_NETWORK` (default: `reverse-proxy`).
- [x] Deploy verifier kiểm tra DNS/reachability gateway, Redis và `/api/health` từ CRM container.
- [ ] Browser/máy người dùng không resolve được Supabase internal hostname.
- [ ] Browser/máy người dùng không kết nối được Supabase internal service.
- [ ] Rotate anon key sau khi browser leakage đã được loại bỏ.
- [ ] Rotate service-role key nếu từng xuất hiện trong deploy/build history.
- [ ] Kiểm tra firewall.
- [x] Docker healthcheck and CI post-deploy verifier cover CRM readiness and private dependencies.
- [x] Runbook covers deploy, rollback, backup/restore, Redis flush recovery and key rotation.

### Acceptance D1.3

- [ ] `docker compose ps` xác nhận chỉ reverse proxy publish public ports.
- [ ] CRM → Supabase private gateway: PASS.
- [ ] Browser/host external → Supabase internal services: BLOCKED.
- [ ] Redis không public port.
- [ ] Postgres không public port.

---

## D1.4 Test infrastructure and CI gates

- [x] `npm test` uses Node recursive discovery; no `find` or `/dev/null` dependency.
- [x] `npm run dev` and Playwright use Node launcher with portable `NODE_OPTIONS` handling.
- [x] `npm run test:platform` owns Dev 1 auth/session/proxy/request-context/JWKS/Redis suite.
- [x] Request-context and `cookies()` tests run through valid mocked request context.
- [x] `scripts/check-supabase-leakage.mjs` is the cross-platform hard-fail command.
- [x] Docker verifier runs lint → typecheck → test → build → leakage report.
- [x] Redis-down and Supabase/JWKS-down tests assert resilient cache behavior or safe `503` responses with request ID/structured logging.
- [ ] Run launcher/build matrix on Windows and the GitLab runner.
- [ ] Change CI leakage report to hard-fail after Dev 2 removes `/storage/v1`.

### Dev 1 chịu trách nhiệm sửa các test fail thuộc

- [x] Auth, middleware/proxy, session, request context, `cookies()`, env and test infrastructure regressions have an assigned platform suite.
- [ ] Triage any failure found by Windows/GitLab matrix or real E2E separately from Dev 2 domain suites.

> Test fail thuộc domain business cụ thể giao Dev 2.

## D1.5 Handoff and final acceptance

- [x] Stable handoff contract documents `getAuthContext()`, permission checks, user/admin server clients, `bffRoute`, request ID, and safe auth-outage behavior.
- [x] `npm run final:acceptance` runs lint → typecheck → unit tests → build → hard browser-leakage check in one cross-platform command.
- [x] Real session E2E is explicitly opt-in with `FINAL_ACCEPTANCE_E2E=1`, preventing an accidental mutation of a shared database.
- [ ] Dev 2 confirms domain routes follow the handoff contract and no browser Supabase client/API path remains.
- [ ] Staging applies durable-session migration and passes real login/refresh/logout/revoke/disable E2E.
- [ ] Production private-network verifier confirms reverse proxy is the only public ingress; key rotation is completed after leakage is eliminated.

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

- [x] `npm run lint` pass (verified 2026-08-28).
- [x] `npm run typecheck` pass (verified 2026-08-28).
- [x] `npm test` pass (259 tests: 254 pass, 5 intentional skips; verified 2026-08-28).
- [x] `npm run build` pass (verified 2026-08-28).
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
- [x] Redis-down test pass (unit contract).
- [x] Supabase-down test pass (unit contract returns safe `503`).

---

## H. Documentation / Ops sign-off

**Owner: Shared + Owner/Ops**

- [ ] Cập nhật `BFF-TASKS.md`.
- [ ] Cập nhật `BFF-TASKS-vi.md`.
- [x] Cập nhật current-system documentation.
- [x] Cập nhật deployment documentation.
- [x] Cập nhật rollback runbook.
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
