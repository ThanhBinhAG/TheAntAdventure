# BFF final cutover checklist — Split for 2 Devs

## Mục tiêu

CRM là public application duy nhất. Browser chỉ gọi CRM origin; chỉ CRM server kết nối Supabase qua private Docker network. Redis là cache tùy chọn, không phải source of truth.

Baseline ban đầu ngày 2026-08-26; đối soát local gần nhất ngày 2026-08-31:

- [x] `npm run lint` pass.
- [x] `npm run typecheck` pass.
- [x] `npm run build` pass.
- [x] Browser bundle không còn dấu vết Supabase — `npm run leakage:check` pass (143 client chunks, 2026-08-31).
- [x] Unit test pass — `npm test` pass 319/324 tests, 5 skipped, 0 failed (2026-08-31).
- [x] E2E pass — isolated Supabase test database lifecycle đã được xác minh; launcher đa nền tảng chạy được.

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

> Last reconciled: 2026-08-29. `[x]` means the source/configuration and its
> local regression coverage are complete. Deployment evidence is recorded only
> when the corresponding GitLab job or operator check has succeeded.



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
- [x] Legacy Storage URL parsing đã ở server DTO; browser bundle chỉ dùng CRM media routes và hard leakage check pass.



### Acceptance D1.1

- [x] Production build không cần bất kỳ `NEXT_PUBLIC_SUPABASE_*` variable nào.
- [x] Server configuration and CI deploy use `SUPABASE_URL` at runtime only.
- [x] Browser bundle không nhận Supabase URL/key từ build env.
- [x] Final browser leakage check passes after Dev 2 storage cutover.

---



## D1.2 CRM-owned session

- [x] Browser chỉ nhận opaque HttpOnly `crm_session`; Supabase access/refresh tokens không được trả, lưu cookie, storage hoặc log.
- [x] Durable `crm_sessions` stores hash opaque token and AES-GCM encrypted server credentials; Redis không là source of truth.
- [x] Login, refresh (atomic rotation), logout/revoke, Proxy và `getAuthContext` dùng CRM session boundary.
- [x] Legacy `sb-crm-access-token` và `sb-*-auth-token` được dọn khi gặp.
- [x] BFF user-scoped client chỉ nhận verified CRM auth context; disable account ban Auth và revoke all durable sessions.
- [x] Ops schedule host job `npm run session:cleanup`; code/script is ready but the repository cannot prove a real crontab exists. Run daily; it retains expired/revoked rows for 30 days by default, or 7 days only when `CRM_SESSION_RETENTION_DAYS=7` is explicitly set.
- [x] Production main deploy applies `20260827104813_durable_crm_sessions_v2.sql` through `supabase db push` before replacing CRM; deployment and durable-session login succeeded on 2026-08-29.
- [x] Apply the migration and run the same lifecycle E2E on staging (owner confirmed).
- [x] Đã kiểm tra login/refresh/logout/revoke/disable trên Supabase Auth và Postgres test thật.



### Auth/session tests

- [x] Unit tests: login success/failure, refresh success/failure, logout, revoke, disabled account, legacy-cookie cleanup, JWT/JWKS outage và Redis graceful degradation.
- [x] E2E contract now asserts opaque `crm_session`, never a retired Supabase cookie.
- [x] E2E login/session lifecycle against a dedicated test Supabase instance (`E2E_ALLOW_DATABASE_MUTATION=1`).

---



## D1.3 Production network and secrets

> The private Supabase/Redis dependency controls are implemented. To preserve
> the existing Ops-managed ingress, `docker-compose.yml` retains CRM host port
> `${APP_PORT:-3006}:3006`; proxy configuration is out of repository scope.

- [x] Production Compose giữ CRM `${APP_PORT:-3006}:3006` để không thay đổi upstream proxy hiện có.
- [x] Không còn yêu cầu `CRM_PROXY_NETWORK` hoặc thay đổi cấu hình reverse proxy từ CRM Compose.
- [x] Redis production không có host `ports:` mapping.
- [x] Supabase gateway không có host port mapping (Ops confirmed).
- [x] Supabase Auth không có host port mapping (Ops confirmed).
- [x] Supabase REST không có host port mapping (Ops confirmed).
- [x] Supabase Storage không có host port mapping (Ops confirmed).
- [x] Supabase Realtime không có host port mapping (Ops confirmed).
- [x] Supabase Studio không có host port mapping (Ops confirmed).
- [x] Supabase Postgres không có host port mapping (Ops confirmed).
- [x] Existing Ops-managed ingress continues to route to `APP_PORT` after the 2026-08-29 main deployment; repository does not own its configuration.
- [x] Deploy verifier kiểm tra DNS/reachability gateway, Redis và `/api/health` từ CRM container.
- [x] Browser/máy người dùng không resolve được Supabase internal hostname.
- [x] Browser/máy người dùng không kết nối được Supabase internal service.
- [x] Rotate anon key sau khi browser leakage đã được loại bỏ (owner confirmed).
- [x] Rotate service-role key nếu từng xuất hiện trong deploy/build history (exposure-history audit completed; owner confirmed).
- [x] Kiểm tra firewall (owner confirmed).
- [x] Docker healthcheck and CI post-deploy verifier cover CRM readiness and private dependencies.
- [x] Runbook covers deploy, rollback, backup/restore, Redis flush recovery and key rotation.



### Acceptance D1.3

- [x] `docker compose ps` xác nhận CRM bind đúng `${APP_PORT:-3006}:3006` và ingress hiện có hoạt động.
- [x] CRM → Supabase private gateway: PASS through the successful deploy-time verifier.
- [x] Browser/host external → Supabase internal services: BLOCKED (owner confirmed).
- [x] Redis không public port.
- [x] Postgres không public port (covered by the confirmed Supabase Postgres host-port check).

---



## D1.4 Test infrastructure and CI gates

- [x] `npm test` uses Node recursive discovery; no `find` or `/dev/null` dependency.
- [x] `npm run dev` and Playwright use Node launcher with portable `NODE_OPTIONS` handling.
- [x] `npm run test:platform` owns Dev 1 auth/session/proxy/request-context/JWKS/Redis suite.
- [x] Request-context and `cookies()` tests run through valid mocked request context.
- [x] `scripts/check-supabase-leakage.mjs` is the cross-platform hard-fail command.
- [x] Docker verifier runs lint → typecheck → test → build → hard leakage check.
- [x] Redis-down and Supabase/JWKS-down tests assert resilient cache behavior or safe `503` responses with request ID/structured logging.
- [x] Launcher/build matrix đã xác minh trên Windows và GitLab runner.
- [x] CI leakage check là hard-fail sau khi Dev 2 hoàn tất private photo/BFF cutover.



### Dev 1 chịu trách nhiệm sửa các test fail thuộc

- [x] Auth, middleware/proxy, session, request context, `cookies()`, env and test infrastructure regressions have an assigned platform suite.
- [x] Windows, GitLab and isolated E2E matrix completed without a remaining platform failure to triage; future failures remain Dev 1 triage work.

> Test fail thuộc domain business cụ thể giao Dev 2.



## D1.5 Handoff and final acceptance

- [x] Stable handoff contract documents `getAuthContext()`, permission checks, user/admin server clients, `bffRoute`, request ID, and safe auth-outage behavior.
- [x] `npm run final:acceptance` runs lint → typecheck → unit tests → build → hard browser-leakage check in one cross-platform command.
- [x] Real session E2E is explicitly opt-in with `FINAL_ACCEPTANCE_E2E=1`, preventing an accidental mutation of a shared database.
- [x] Dev 2 confirms domain routes follow the handoff contract and no browser Supabase client/API path remains.
- [x] Staging applies durable-session migration and passes real login/refresh/logout/revoke/disable E2E (owner confirmed).
- [x] Production verifier confirms private Supabase/Redis dependencies and the existing ingress remains unchanged.
- [x] Ops completes planned anon-key rotation; service-role rotation remains conditional on an exposure-history audit (owner confirmed).

---



# DEV 2 CHECKLIST — Domain BFF / Browser Cutover / Storage



## D2.1 Chuẩn vertical slice bắt buộc cho mỗi domain

> **Template tham chiếu** — checklist dưới đây là tiêu chí chung; từng domain đánh dấu DONE ở mục riêng (D2.2+) hoặc trong audit [`BFF-D2.12-MUTATION-AUDIT.md`](BFF-D2.12-MUTATION-AUDIT.md). Không tick template toàn cục khi còn domain chưa đạt parity.

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

**Domains đã đạt D2.1 (theo checklist riêng hoặc Dev A/B stage 1):**

*Dev A (stage 1 — `docs/BFF-TASKS-vi.md` A0–A5):*

- [x] Auth & Session — platform boundary; chi tiết D1.2.
- [x] Tour Product + Pricing — `/api/products*`, `/api/products/pricing*`, `/api/pricing/*`; chi tiết A2 (2026-08-21).
- [x] Daily Planner — `/api/planner*`; chi tiết A3.
- [x] Attraction Schedule — `/api/attractions*`; chi tiết A4.
- [x] Tour Design — `/api/tour-design/*`, `/api/proposals/*`; chi tiết A5.

*Dev B (stage 1 — `docs/BFF-TASKS-vi.md` B1–B8):*

- [x] Clients — `/api/customers*`; chi tiết B1 + B7.
- [x] B2B Agents — `/api/agents*`; chi tiết B2.
- [x] Sales Pipeline — `/api/leads*`; chi tiết B3.
- [x] Photo Gallery — `/api/photos*`, `/api/photo-folders*`; chi tiết B4.
- [x] Weather Guide — `/api/weather/*`; chi tiết B5.
- [x] Dashboard — `/api/dashboard`; chi tiết Dashboard BFF.

*Dev 2 (stage 2 — D2.2–D2.10):*

- [x] Bookings — đủ slice UI hiện tại; chi tiết D2.2 (2026-08-27). `DELETE` API deferred vì UI không có xóa booking.
- [x] Contracts — đủ slice UI hiện tại; chi tiết D2.3 (2026-08-27). `DELETE`/archive deferred vì UI không có.
- [x] Suppliers — đủ slice UI hiện tại (Hotels+rooms, Transport, Restaurants, Cruises, Extended); chi tiết D2.4 (2026-08-27).
- [x] Post-tour / Feedback — chi tiết D2.5.
- [x] Finance / AR / AP — chi tiết D2.6 (read-only UI).
- [x] Tax Reports — chi tiết D2.7.
- [x] HR / Salary / Staff — chi tiết D2.8.
- [x] Dev Notes — chi tiết D2.9.
- [x] Guide Calendar (`cal_events`) — chi tiết D2.10.

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

- [x] Hoàn thành full vertical slice Post-tour.
- [x] Hoàn thành full vertical slice Feedback.
- [x] Authorization theo booking/tour/user ownership nếu có.
- [x] Không browser direct Supabase.

---



## D2.6 Finance / AR / AP

- [x] Hoàn thành Finance BFF.
- [x] Hoàn thành Accounts Receivable BFF.
- [x] Hoàn thành Accounts Payable BFF.
- [x] DTO không leak internal finance fields ngoài nhu cầu UI.
- [x] Permission theo role.
- [x] Object-level authorization. *(Page + `finance.read`; no row-level scope in UI today.)*
- [x] Mutation rollback. *(N/A — read-only UI; deferred until write forms exist.)*
- [x] Tests.

---



## D2.7 Tax Reports

- [x] Hoàn thành Tax Reports BFF.
- [x] Read/filter/export qua CRM server.
- [x] Không browser query trực tiếp Supabase.
- [x] Permission.
- [x] DTO boundary.
- [x] Tests.

---



## D2.8 HR / Salary / Staff

- [x] Hoàn thành HR BFF.
- [x] Hoàn thành Salary BFF.
- [x] Hoàn thành Staff BFF. *(Shared `staff` table via `/api/hr` + `/api/salary`; read-only UI slice.)*
- [x] Không trả salary/sensitive fields nếu UI không cần. *(HR DTO excludes `baseSalary`.)*
- [x] Kiểm tra role permission nghiêm ngặt.
- [x] Object-level authorization. *(Page + `hr.read` / `salary.read`; no row-level scope in UI today.)*
- [x] Tests.

---



## D2.9 Dev Notes

- [x] Hoàn thành Dev Notes BFF.
- [x] Read qua BFF.
- [x] Mutation qua BFF.
- [x] Permission.
- [x] DTO.
- [x] Rollback/cache invalidation.
- [x] Tests.

---



## D2.10 Guide Calendar / `cal_events`

- [x] Hoàn thành Guide Calendar BFF.
- [x] Chuyển `cal_events` reads sang BFF.
- [x] Chuyển `cal_events` writes sang BFF.
- [x] Permission.
- [x] Object-level authorization. *(Repository validates `guideId` exists.)*
- [x] DTO.
- [x] Rollback/cache invalidation.
- [x] Tests.

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

> **Inventory:** [`BFF-D2.12-MUTATION-AUDIT.md`](BFF-D2.12-MUTATION-AUDIT.md) (đối soát 2026-08-31).

- [x] Audit mọi Zustand mutation. *(28/28 `SYNC_ARRAY_TABLES` BFF-managed; Team Chat excluded — local-only.)*
- [x] Xác định mutation nào đang chờ generic auto-sync. *(Stack removed D2.13; `lib/db/sync-guard.ts` replaces `withoutAutoSyncAsync`.)*
- [x] Chuyển mọi business mutation sang BFF. *(CRM sync tables: BFF-first → Zustand mirror; không dual-write.)*
- [x] Không domain nào vừa BFF write vừa generic direct sync. *(Legacy auto-sync/hydrate modules deleted — D2.13.)*
- [x] Audit mọi API response. *(Repositories map qua DTO; xem inventory per-domain.)*
- [x] Không API nào trả raw Supabase rows. *(Contract tests per domain.)*
- [x] Không API nào trả sensitive fields không cần thiết. *(HR excludes `baseSalary`; finance/tax DTO boundaries tested.)*

---



## D2.13 Remove browser Supabase data stack

> Chỉ thực hiện khi toàn bộ domain BFF phía trên đã đạt parity (Team Chat excluded — xem D2.11).
>
> **Kế hoạch chi tiết:** [`BFF-D2.13-REMOVAL-PLAN.md`](BFF-D2.13-REMOVAL-PLAN.md).



### Browser Supabase client

- [x] Xóa `lib/supabase/client.ts`.
- [x] Xóa browser singleton trong `lib/supabase/index.ts`.
- [x] Xác nhận production source không còn `createBrowserClient`.



### Browser Supabase I/O

- [x] Xóa/retire browser I/O trong `lib/db/supabase/**`.
- [x] Giữ pure row mappers nếu server repository còn sử dụng.
- [x] Không browser import `lib/db/supabase`.



### Hydrate stack

- [x] Xóa/retire `lib/db/hydrate/**`.
- [x] Xóa/retire `lib/db/hydrate.ts`.
- [x] Xóa route hydrate configuration (`PAGE_BOOT_TABLES` removed from `sync-config`).
- [x] Xóa shell hydrate configuration.



### Auto-sync stack

- [x] Xóa/retire `lib/db/auto-sync.ts`.
- [x] Xóa/retire `sync-push.ts`.
- [x] Xóa/retire `remote-delete.ts`.
- [x] Xóa sync lifecycle.



### UI lifecycle/components

- [x] Gỡ `AutoSyncListener`.
- [x] Gỡ `PageDataGate`.
- [x] Gỡ Supabase context.
- [x] Gỡ migration controls khỏi `StoreProvider`/Topbar.
- [x] Gỡ push controls khỏi `StoreProvider`/Topbar.



### Zustand boundary

- [x] Zustand chỉ dùng cho UI state.
- [x] Zustand chỉ dùng cho local cache khi phù hợp.
- [x] Zustand chỉ dùng cho optimistic state khi phù hợp.
- [x] Zustand không còn là full database replica.



### Acceptance D2.13

- [x] Không còn `createBrowserClient`.
- [x] Không browser import `lib/db/supabase`.
- [x] Không browser hydrate từ Supabase.
- [x] Không generic auto-sync.
- [x] Không direct browser mutation vào Supabase.

---



## D2.14 Storage và asset URLs

> **Kế hoạch chi tiết:** [`BFF-D2.14-ASSET-URL-PLAN.md`](BFF-D2.14-ASSET-URL-PLAN.md). Hoàn thành 2026-08-31 — checklist: [`Personal/docs/stage-2/d2.14-checklist.md`](../Personal/docs/stage-2/d2.14-checklist.md).

Target:

```text
Browser
  -> CRM-origin asset endpoint
  -> CRM server
  -> Supabase Storage private network
```



### Asset URL rules

- [x] Mọi ảnh browser dùng CRM-origin URL.
- [x] Không trả `*.supabase.co/storage/v1/...`.
- [x] Không trả `supabase-ant-crm-gateway:8000`.
- [x] Không trả internal Supabase hostname.



### Company logo

- [x] Thêm CRM asset endpoint cho company logo.
- [x] `/api/branding/logo` không trả raw Supabase public URL.
- [x] Logo được stream/proxy hoặc resolve qua CRM-origin URL.



### DTO photo normalization

- [x] Gallery photo DTO dùng CRM asset URL.
- [x] Product photo DTO dùng CRM asset URL.
- [x] Attraction photo DTO dùng CRM asset URL.
- [x] Guide photo DTO dùng CRM asset URL.
- [x] Weather photo DTO dùng CRM asset URL.
- [x] Proposal photo DTO dùng CRM asset URL.



### `storage-image-src.ts`

- [x] Không đọc Supabase public env.
- [x] Không tạo direct Supabase browser URL.
- [x] Chỉ cho phép CRM-origin asset URL.



### Asset tests

- [x] Unauthenticated asset access.
- [x] Forbidden asset access.
- [x] Invalid path.
- [x] Missing object.
- [x] Correct content type.
- [x] Cache headers.
- [x] Không leak Supabase URL trong response/header.

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
- [x] Guide Calendar.
- [x] Post-tour / Feedback.
- [x] Finance / AR / AP.
- [x] Tax Reports.
- [x] HR / Salary / Staff.
- [x] Dev Notes.
- [ ] Team Chat. *(Excluded from cutover gate — D2.11 unavailable.)*
- [x] Pricing. *(Dev A A2 — `/api/products/pricing*`, `/api/pricing/*`; `product_pricing` ∈ `BFF_MANAGED_TABLES`.)*

Song song Dev 1:

- [x] CRM-owned session. *(Source complete — D1.2; staging/prod migration apply pending.)*
- [x] Cross-platform tests.
- [x] CI leakage gate.
- [ ] Docker/network hardening. *(Ops gates — D1.3.)*

---



## Phase 3 — Browser Supabase removal

Chỉ bắt đầu khi:

- [x] Bookings đạt parity.
- [x] Contracts đạt parity.
- [x] Suppliers đạt parity.
- [x] Post-tour / Feedback đạt parity.
- [x] Finance / AR / AP đạt parity.
- [x] Tax Reports đạt parity.
- [x] HR / Salary / Staff đạt parity.
- [x] Dev Notes đạt parity.
- [x] Guide Calendar đạt parity.
- [ ] Team Chat đạt parity. *(Excluded — D2.11 unavailable.)*
- [x] Pricing đạt parity. *(Dev A A2.)*

Sau đó Dev 2:

- [x] Remove browser Supabase client.
- [x] Remove hydrate.
- [x] Remove auto-sync.
- [x] Remove direct browser storage URLs.

---



## Phase 4 — Production cutover



### Dev 1

- [x] Apply private network isolation.
- [x] Remove public service ports.
- [x] Rotate keys.
- [x] Run deploy/rollback verification.



### Dev 2

- [ ] Run full domain Playwright.
- [ ] Verify asset CRM-origin URLs.
- [ ] Verify no domain direct sync.

---



# FINAL ACCEPTANCE

> This is the cross-owner production sign-off matrix, not a second source-code
> backlog. Use D1.1–D1.5 above for the reconciled Dev 1 implementation status;
> leave the items below unchecked until their manual browser, host, or Owner/Ops
> evidence is recorded.



## A. Browser boundary

**Owner: Dev 1 + Dev 2**

- [x] Browser DevTools Fetch chỉ gọi CRM origin (verified manually on production).
- [x] Browser DevTools XHR chỉ gọi CRM origin (verified manually on production).
- [x] Browser WebSocket chỉ gọi CRM origin (owner confirmed).
- [x] Browser cookies không chứa Supabase token.
- [x] Browser cookies không chứa Supabase key.
- [x] Browser localStorage không chứa Supabase token/key/URL.
- [x] Browser sessionStorage không chứa Supabase token/key/URL.
- [x] Chặn outbound browser access tới Supabase không ảnh hưởng CRM (owner confirmed).

---



## B. Production bundle leakage

**Owner: Dev 1**

- [x] `.next/static` không chứa Supabase hostname.
- [x] `.next/static` không chứa Supabase key.
- [x] `.next/static` không chứa `NEXT_PUBLIC_SUPABASE`.
- [x] `.next/static` không chứa `/auth/v1`.
- [x] `.next/static` không chứa `/rest/v1`.
- [x] `.next/static` không chứa `/storage/v1`.
- [x] `.next/static` không chứa `/realtime/v1`.

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

- [x] Browser chỉ giữ CRM session.
- [x] Không Supabase access token trong browser.
- [x] Không Supabase refresh token trong browser.
- [x] Không Supabase auth legacy cookie.
- [x] Session source of truth là durable server-side store.
- [x] Redis chỉ là optional cache.
- [x] Revoke hoạt động.
- [x] Disabled account bị chặn.
- [x] Logout cleanup đầy đủ.

---



## E. Storage

**Owner: Dev 2**

- [x] Mọi asset browser dùng CRM-origin URL.
- [x] Không browser URL chứa Supabase Storage hostname.
- [x] Company logo đi qua CRM asset endpoint.
- [x] Gallery/Product/Attraction/Guide/Weather/Proposal đều dùng CRM asset URLs.
- [x] Asset authorization hoạt động.
- [x] Asset cache headers đúng.

---



## F. Production network

**Owner: Dev 1**

- [x] CRM giữ `${APP_PORT:-3006}:3006` để tương thích ingress/proxy hiện có; cấu hình proxy không thuộc CRM Compose.
- [x] Redis không publish host port.
- [x] Supabase gateway không publish host port.
- [x] Supabase services không publish host port.
- [x] Postgres không publish host port.
- [x] CRM resolve được `supabase-ant-crm-gateway:8000`.
- [x] Browser không resolve/kết nối Supabase internal hostname.

---



## G. Test gates

**Owner: Shared**

- [x] `npm run lint` pass (verified 2026-08-28).
- [x] `npm run typecheck` pass (verified 2026-08-28).
- [x] `npm test` pass (324 tests: 319 pass, 5 intentional skips; verified 2026-08-31).
- [x] `npm run build` pass (verified 2026-08-31).
- [x] Supabase leakage check pass (`npm run leakage:check` — 143 client chunks; verified 2026-08-31).
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
- [ ] Playwright Team Chat pass. *(Deferred — D2.11 excluded from cutover gate.)*
- [x] Redis-down test pass (unit contract).
- [x] Supabase-down test pass (unit contract returns safe `503`).

---



## H. Documentation / Ops sign-off

**Owner: Shared + Owner/Ops**

- [x] `BFF-TASKS.md` identifies itself as a historical implementation plan; current delivery status is in this checklist.
- [x] `BFF-TASKS-vi.md` identifies itself as a historical implementation plan; current delivery status is in this checklist.
- [x] Cập nhật current-system documentation.
- [x] Cập nhật deployment documentation.
- [x] Cập nhật rollback runbook.
- [x] Owner/Ops xác nhận network isolation (owner confirmed).
- [x] Owner/Ops xác nhận key rotation (owner confirmed).
- [x] Owner/Ops xác nhận deployment (owner confirmed).
- [x] Owner/Ops xác nhận rollback (owner confirmed).

---



# Definition of Done

Cutover chỉ được đánh dấu **DONE** khi tất cả điều kiện sau cùng đúng:

- [x] CRM là public application duy nhất.
- [x] Browser chỉ gọi CRM origin.
- [x] Supabase chỉ được CRM server gọi qua private Docker network.
- [x] Browser không chứa Supabase URL/key/token.
- [x] Browser production bundle không chứa Supabase endpoints.
- [x] Không còn browser Supabase client.
- [x] Không còn generic hydrate/direct sync cho business data.
- [ ] Tất cả domain chính đã chuyển sang permissioned BFF.
- [x] Redis-down không làm mất khả năng đọc/ghi source of truth.
- [x] Supabase-down fail safely.
- [x] Existing ingress/proxy vẫn route CRM sau production deploy.
- [x] Lint pass.
- [x] Typecheck pass.
- [x] Unit test pass.
- [x] Production build pass.
- [x] Leakage check pass.
- [ ] Playwright pass.
- [x] Documentation cập nhật.
- [x] Owner/Ops sign-off.
