# Báo cáo Review Migration Developer A - 2026-08-21

## Phạm vi và phương pháp

- **Khoảng commit review:** `f230535..5539d1a` trên nhánh `feat/refacter_plan_a`.
- **Mốc hệ thống cũ:** `f230535`, là commit ngay trước chuỗi migration BFF này.
- **Phương pháp:** đọc lịch sử theo từng commit; trace code hiện tại từ UI -> BFF -> repository/RLS; tìm call-site cutover; chạy các test gate của dự án.
- **Không thuộc phạm vi:** triển khai feature của Dev B, hạ tầng private network và kiểm thử thâm nhập bảo mật.

## Tóm tắt điều hành

Developer A đã hoàn thành phần lớn migration feature trong code: CRM session, BFF primitives, Product/Pricing, Planner, Attractions và Tour Design đều đã đi qua BFF server. Browser auto-sync đã loại trừ sáu bảng Dev A, và Tour Design đã lưu aggregate bằng PostgreSQL transaction.

Tuy nhiên, migration **chưa sẵn sàng để final cutover**. Có một lỗi toàn vẹn dữ liệu mức Critical ở Product import, hai vấn đề độ tin cậy mức High ở ghi nhiều bảng và Redis-backed session, và build production chưa chạy tới leakage gate do dependency Chromium local không hợp lệ.

| Mức độ | Số lượng | Điều kiện release |
|---|---:|---|
| Critical | 1 | Phải sửa trước khi dùng Product import ở production |
| High | 2 | Phải sửa trước khi xác nhận Dev A feature acceptance hoàn tất |
| Medium | 3 | Cần xử lý hoặc chấp nhận rõ ràng trước final BFF cutover |
| Low | 0 | - |

## Hệ thống trước và sau thay đổi

| Hạng mục | Trước `f230535` | Hiện tại `5539d1a` | Trạng thái |
|---|---|---|---|
| Đọc dữ liệu ở browser | Generic hydrate và browser Supabase client | Màn Dev A gọi business BFF endpoint | Đã migration cho Dev A |
| Ghi dữ liệu ở browser | Auto-sync snapshot/table helper | Mutation qua BFF; `BFF_MANAGED_TABLES` chặn Dev A table push | Đã migration cho Dev A |
| Xác thực | Supabase cookie/token tham gia luồng browser | CRM cookie opaque có chữ ký; Supabase token nằm trong Redis session | Đã migration, còn gap availability |
| Product list | Có server pagination nhưng cache policy chưa đầy đủ | Server RPC + cache-aside list/facets + invalidation | Đã migration |
| Lưu Tour Design | Ghi nhiều bước | Một PostgreSQL RPC transaction | Đã migration |
| Legacy dùng chung | Generic hydrate/auto-sync sở hữu toàn bộ bảng | Giữ lại cho Dev B/shared consumer, chặn ghi bảng Dev A | Transitional có chủ đích |
| Public Supabase config | Còn tồn tại | Vẫn còn cho domain chưa migration | A6 chưa làm |

## Timeline commit và phần đã thực hiện

| Commit | Thời gian UTC+7 | Nội dung đã làm | Kết luận review |
|---|---|---|---|
| `98bd0f7` | 2026-08-19 20:14 | BFF wrapper server-only, Zod validation, server Supabase client | Nền tảng chung đúng hướng; API route có permission check |
| `0551f3b` | 2026-08-19 20:27 | Shared Redis cache helper | Cache caller có fallback khi Redis lỗi |
| `e404077` | 2026-08-19 21:11 | Product/Pricing route, repository và UI | BFF migration hoàn tất; ghi/import chưa atomic |
| `81a2b36` | 2026-08-19 21:24 | Planner repository, CRUD route và UI | BFF migration hoàn tất |
| `434e9de` | 2026-08-20 09:33 | Attractions và Tour Design repository/route | BFF migration hoàn tất; Attraction aggregate write chưa atomic |
| `e29f60a` | 2026-08-20 16:31 | Test BFF, cache và RLS | Có unit/API baseline tốt; chưa có browser E2E |
| `fa75f51` | 2026-08-20 21:41 | CRM session, middleware, server client migration | Browser token đã bỏ; Redis thành session dependency |
| `68a77a9`, `72433bb` | 2026-08-20 21:45-22:01 | Lint cleanup và session expiry test | Hoàn tất regression cơ bản cho session |
| `ef7689a`, `77430a4` | 2026-08-20 22:14-22:26 | Planner/Attractions UI BFF read; bỏ Dev A browser push | Hướng cutover đúng |
| `ee342e4` | 2026-08-20 22:53 | Transactional Tour Design RPC | Đạt yêu cầu lưu aggregate atomic |
| `5539d1a` | 2026-08-20 23:13 | Pricing/Gallery BFF read, cache-aside list, full-hydrate cleanup, leakage script | Dev A legacy cleanup hoàn tất; chưa chứng minh được bundle thật |

Khoảng review thay đổi 131 files, thêm 5.591 dòng và xóa 1.001 dòng.

## Trạng thái theo feature Dev A

| Feature | Luồng hiện tại | Bằng chứng auto test | Trạng thái acceptance |
|---|---|---|---|
| Auth & Session | Login -> CRM HttpOnly cookie -> Redis session -> server user-scoped Supabase client | `auth-session-routes`, `crm-session`, BFF primitive test | Code hoàn tất; cần xử lý Redis outage |
| Tour Product/Pricing | UI -> `/api/products*` -> repository/RPC -> Redis cache -> Supabase | Product route, cache, pagination, mutation test | BFF path hoàn tất; phải sửa atomicity |
| Daily Planner | UI -> `/api/planner*` -> repository -> Supabase | Planner CRUD và cutover test | Code hoàn tất; còn browser acceptance |
| Attraction Schedule | UI -> `/api/attractions*` -> repository -> Supabase | Attraction CRUD và cutover test | BFF path hoàn tất; còn atomicity và hiệu năng read theo vùng |
| Tour Design | UI -> `/api/tour-design/*` -> repository -> transaction RPC | Read/save/failed-RPC test | Hoàn tất aggregate draft/outline |

## Findings

### Critical

#### CRIT-01: Product import có thể xóa catalogue hiện tại trước khi dữ liệu mới được lưu an toàn

Trạng thái theo dõi: **đã xử lý trong workspace ngày 2026-08-21** bằng migration `20260821100600_add_product_catalogue_import_transaction.sql`; cần áp dụng migration ở từng môi trường trước khi deploy route mới.

- **Bằng chứng:** [app/api/products/import/route.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/app/api/products/import/route.ts#L23) xóa toàn bộ Product, sau đó chèn Product và Pricing bằng các statement riêng ở dòng 31-45.
- **Ảnh hưởng:** nếu insert lỗi, timeout, validation hoặc database lỗi sau delete, catalogue sẽ rỗng hoặc chỉ được khôi phục một phần. API trả lỗi nhưng dữ liệu cũ không thể tự khôi phục.
- **Vì sao test chưa bắt được:** [tour-product-bff.test.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/tests/tour-product-bff.test.ts) chỉ test import thành công, không test lỗi giữa delete và insert dữ liệu thay thế.
- **Cần sửa:** thay chuỗi delete/insert bằng một PostgreSQL RPC transaction có permission scope. Validate payload trước transaction. Thêm test ép Product hoặc Pricing insert lỗi và xác nhận catalogue cũ vẫn nguyên vẹn.

### High

#### HIGH-01: Product và Attraction ghi aggregate nhiều bước có thể để lại dữ liệu nửa vời

Trạng thái theo dõi: **đã xử lý trong workspace ngày 2026-08-21** bằng migration `20260821110000_add_catalogue_aggregate_transactions.sql`; cần áp dụng migration ở từng môi trường trước khi deploy route mới.

- **Bằng chứng:** [product-repository.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/products/product-repository.ts#L60) tạo Product, Pricing và photo link qua các statement riêng. Update Product thay đổi parent, xóa photo link rồi insert lại ở [dòng 102-120](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/products/product-repository.ts#L102). [attraction-repository.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/attractions/attraction-repository.ts#L43) có cùng pattern; update xóa link cũ ở [dòng 76-87](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/attractions/attraction-repository.ts#L76).
- **Ảnh hưởng:** lỗi ở statement thứ hai/thứ ba có thể tạo Product không có Pricing, Product/Attraction mất toàn bộ ảnh liên kết, hoặc Attraction mới tạo không có ảnh đã chọn. UI báo lỗi nhưng aggregate trong database đã bị thay đổi.
- **Cần sửa:** tạo transactional RPC riêng cho từng aggregate, theo pattern Tour Design trong [20260820223000_add_tour_design_save_transaction.sql](/home/ngon/Du_an_CRM/crm-the-ants_02/supabase/migrations/20260820223000_add_tour_design_save_transaction.sql). Thêm rollback test cho lỗi create/update photo link.

#### HIGH-02: Redis outage làm mọi CRM session trở thành không xác thực

Trạng thái theo dõi: **đã xử lý trong workspace ngày 2026-08-21** bằng migration `20260821113000_add_durable_crm_sessions.sql` và quyết định vận hành tại [SESSION-AVAILABILITY.md](/home/ngon/Du_an_CRM/crm-the-ants_02/docs/SESSION-AVAILABILITY.md). Cần áp dụng migration và cấu hình service-role trên từng môi trường trước khi deploy.

- **Bằng chứng:** [crm-session.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/auth/crm-session.ts#L111) trả `null` khi `getRedisClient()` không khả dụng. [session.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/auth/session.ts#L16) coi request là chưa đăng nhập. Login cũng trả `503` nếu không tạo được Redis session tại [login route dòng 173-184](/home/ngon/Du_an_CRM/crm-the-ants_02/app/api/auth/login/route.ts#L173).
- **Ảnh hưởng:** Redis outage làm người dùng mất effective access, trái với definition of done yêu cầu CRM vẫn dùng được khi Redis không khả dụng. Khác với Product cache, Redis ở đây không chỉ là cache miss.
- **Cần sửa:** thống nhất availability design với Owner-Ops: ví dụ session store durable ở server, Redis chỉ tăng tốc/revoke cache, hoặc session backend active/passive được vận hành rõ ràng. Thêm outage integration test cho user đã đăng nhập và luồng login.

### Medium

#### MED-01: Attraction filter theo vùng vẫn lấy toàn bộ photo link

Trạng thái theo dõi: **đã xử lý trong workspace ngày 2026-08-21**; read path nay chỉ lấy photo link theo danh sách Attraction đã lọc ở server.

- **Bằng chứng:** parent query có filter `region` tại [attraction-repository.ts dòng 22](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/attractions/attraction-repository.ts#L22), nhưng query sau vẫn `select` toàn bộ `attraction_photos` ở [dòng 26-30](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/attractions/attraction-repository.ts#L26).
- **Ảnh hưởng:** dữ liệu và xử lý của màn theo vùng tăng theo toàn bộ photo-link table, không theo vùng đã chọn.
- **Khuyến nghị:** lấy danh sách attraction ID rồi query `.in('attraction_id', ids)`; return sớm nếu vùng không có Attraction.

#### MED-02: Test acceptance hiện chủ yếu là mock/static contract, chưa phải browser E2E

- **Bằng chứng:** [dev-a-read-bff-cutover.test.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/tests/dev-a-read-bff-cutover.test.ts) và [dev-a-ui-state-contract.test.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/tests/dev-a-ui-state-contract.test.ts) kiểm tra source string. Domain route test mock session/Supabase. [package.json](/home/ngon/Du_an_CRM/crm-the-ants_02/package.json#L61) chưa có browser E2E runner.
- **Ảnh hưởng:** chưa chứng minh được redirect thật, cookie attribute, Network traffic, permission matrix thực, transaction trên PostgreSQL thật, hay state sau failed request thật.
- **Khuyến nghị:** thêm Playwright hoặc runner tương đương cho login/logout, Product mutation/import fail, Planner mutation, Attraction filter/update fail và Tour Design save fail. Chạy test Supabase/Redis stack trong CI cho transaction/outage.

#### MED-03: Leakage gate đã có nhưng chưa chạy trên bundle production hợp lệ

- **Bằng chứng:** [package.json](/home/ngon/Du_an_CRM/crm-the-ants_02/package.json#L10) đã chain `next build --webpack && npm run leakage:check`, nhưng `npm run build` dừng vì không resolve được `@sparticuz/chromium` từ [pricing PDF](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/pricing/pricing-pdf.ts) và [proposal PDF](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/proposals/proposal-pdf.ts).
- **Ảnh hưởng:** scanner có unit test nhưng chưa scan production browser bundle thật. Chưa thể khẳng định không leakage.
- **Khuyến nghị:** sửa dependency local/CI, xác nhận `npm ls @sparticuz/chromium --depth=0` hợp lệ, rồi chạy build đầy đủ và lưu kết quả leakage trong CI.

## Phần còn transitional có chủ đích

Các mục sau chưa phải lỗi Dev A; cần giữ cho tới khi feature owner tương ứng migration xong.

- Browser Supabase client và `NEXT_PUBLIC_SUPABASE_*` vẫn tồn tại cho domain chưa migration.
- Generic hydrate/auto-sync còn dùng cho Dev B/shared consumer; bảng Dev A bị chặn bởi [bff-managed-tables.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/db/bff-managed-tables.ts).
- Sales/sidebar compatibility còn đọc `tour_drafts` và `tasks` qua BFF bridge trong [table-api.ts](/home/ngon/Du_an_CRM/crm-the-ants_02/lib/db/supabase/table-api.ts).

## Xác nhận kỹ thuật đã chạy

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 89 pass, 4 skip do chưa cấu hình `REDIS_URL` |
| `npm run build` | Bị chặn trước leakage scan do local `@sparticuz/chromium` invalid |

Test suite có expected mocked-error log từ BFF và Redis fallback test, nhưng process kết thúc thành công.

## Đối chiếu task

| Task | Checklist | Kết quả review | Việc tiếp theo |
|---|---|---|---|
| A0 Auth & Session | Đã tick | Acceptance một phần: session hoạt động nhưng Redis outage trái mục tiêu availability | Xử lý HIGH-02, thêm outage test thật |
| A0.1 BFF primitives | Đã tick | Hoàn tất trong code | Giữ làm shared boundary |
| A1 Redis cache contract | Đã tick | Hoàn tất cho Product cache path | Chạy integration test với Redis thật |
| A2 Tour Product | Đã tick | BFF path hoàn tất, còn blocker toàn vẹn dữ liệu | Sửa CRIT-01 và HIGH-01 |
| A3 Daily Planner | Đã tick | Code hoàn tất | Thêm browser/permission acceptance test |
| A4 Attraction Schedule | Đã tick | BFF path hoàn tất một phần | Sửa HIGH-01 và MED-01 |
| A5 Tour Design | Đã tick | Aggregate draft/outline hoàn tất | Thêm PostgreSQL-backed E2E transaction proof |
| A6 Final public-Supabase cutover | Chưa tick | Chưa bắt đầu theo thiết kế | Chờ Dev B, Owner-Ops topology và final acceptance |

## Thứ tự thực hiện khuyến nghị

1. Sửa CRIT-01 bằng Product import RPC transaction và failure test.
2. Thêm Product/Attraction aggregate transaction cùng rollback test cho HIGH-01.
3. Chốt và triển khai Redis/session availability design với Owner-Ops cho HIGH-02.
4. Sửa `@sparticuz/chromium`, chạy production build và leakage scan bundle thật.
5. Thêm browser E2E và Redis/PostgreSQL integration coverage.
6. Tiếp tục migration Dev B. Chỉ bắt đầu A6 sau khi chín feature scoped pass acceptance và hạ tầng private được bàn giao.

## Hướng dẫn đọc code theo lịch sử commit

1. Đọc [BFF-TASKS.md](/home/ngon/Du_an_CRM/crm-the-ants_02/docs/BFF-TASKS.md) để nắm ownership và acceptance criteria.
2. Chạy `git diff f230535..5539d1a -- lib/bff lib/auth lib/supabase` để xem nền tảng.
3. Chạy `git show e404077 -- app/api/products lib/products components/products components/pricing` để xem Product/Pricing.
4. Chạy `git show 81a2b36 -- app/api/planner lib/planner components/pages/Planner.tsx` để xem Planner.
5. Chạy `git show 434e9de -- app/api/attractions app/api/tour-design lib/attractions lib/tour-design` để xem Attractions/Tour Design.
6. Chạy `git show fa75f51 -- app/api/auth lib/auth lib/supabase` để xem session.
7. Chạy `git show ef7689a 77430a4 ee342e4 5539d1a` để xem cutover cuối, Tour Design transaction và test gate.
8. Đọc các test trong bảng feature status, sau đó chạy các lệnh xác nhận kỹ thuật ở trên.
