# Acceptance Dev A - 2026-08-21

## Kết luận

Mã nghiệp vụ A0-A5 đã có bằng chứng unit, integration và browser acceptance. Tuy nhiên, không thể xác nhận cutover tổng thể: browser vẫn gọi Supabase trực tiếp và production leakage gate vẫn thất bại. A6 chưa được bắt đầu; đây là việc chung với Developer B và Owner-Ops sau khi chín feature scoped đều đạt acceptance.

## Bằng chứng đã chạy

| Gate | Kết quả | Bằng chứng |
|---|---|---|
| `npm run lint` | Pass | Không có warning/error. |
| `npm run typecheck` | Pass | Không có TypeScript error. |
| `npm test` | Pass | 96 pass, 0 fail, 5 skip do integration opt-in. |
| PostgreSQL session integration | Pass | `CRM_SESSION_POSTGRES_INTEGRATION=1 ... crm-session-postgres.integration.test.ts`; session vẫn đọc/revoke được khi Redis bị tắt. |
| Browser BFF acceptance | Pass | 7 scenario: login/logout, expiry/revoke, 401/403, Product/Pricing, Planner, Attractions, Tour Design transaction rollback. |
| Browser CRM-origin audit | Fail | Mọi màn `/products`, `/planner`, `/attractions`, `/tourdesign` quan sát được request tới Supabase local. |
| `npm run build` | Fail gate | Next production compilation pass; `npm run leakage:check` fail. |

## Đối chiếu A0-A5

| Hạng mục | Trạng thái | Evidence |
|---|---|---|
| A0 Auth & Session | Pass feature acceptance | Browser login/logout, durable session expiry/revoke, unauthenticated `401`, unassigned user `403`, PostgreSQL fallback khi Redis-down. |
| A1 Tour Product | Pass feature acceptance | Product CRUD, Pricing update, invalid import không đổi Product đã có; database assertions thật. |
| A2 Daily Planner | Pass feature acceptance | Task create/update/delete và invalid input không tạo task. |
| A3 Attraction Schedule | Pass feature acceptance | Create, region filter và invalid mutation không ghi dữ liệu. |
| A4/A5 Tour Design | Pass feature acceptance | Save aggregate thành công; duplicate outline day bị reject và draft/outline trước đó giữ nguyên. |

## Finding còn mở

### HIGH-01: Browser vẫn gọi Supabase trực tiếp

Playwright network audit tại `e2e/network-origin.spec.ts` fail trên cả bốn URL Dev A, quan sát origin `http://127.0.0.1:54321`. Trace ghi các request PostgREST direct như `customers`, `leads`, `bookings`, `agents`, `feedback`, `photos`, `photo_folders`, `comms` và `hotels`.

Nguyên nhân là shell legacy `PageDataGate` / `lib/db/hydrate` vẫn gọi `lib/db/supabase` trong browser. Riêng Tour Design còn khởi tạo dữ liệu Customer, Lead, Communication và Hotel, thuộc dependency migration của Developer B. Do đó, feature mutation Dev A đã qua BFF nhưng cả màn chưa đạt tiêu chí "CRM origin only".

Hành động cần phối hợp:

1. Developer B hoàn tất API/read migration cho Customer, Lead, Communication, Hotel, Photo Gallery và các route boot còn dùng browser Supabase.
2. Nhóm loại bỏ `PageDataGate` legacy hydrate và browser Supabase client sau khi đủ feature có BFF thay thế.
3. Chạy lại `E2E_ALLOW_DATABASE_MUTATION=1 npm run test:e2e`; network audit chỉ pass khi object kết quả rỗng.

### HIGH-02: Production browser bundle lộ cấu hình/path Supabase

`npm run build` compile Next thành công nhưng thất bại ở `scripts/scan-leakage.sh`. Bundle vẫn có Supabase URL local, publishable key và code `createBrowserClient`; không ghi giá trị key vào tài liệu này. Đây là hệ quả trực tiếp của browser Supabase paths còn tồn tại, không phải lỗi của PostgreSQL CRM session.

Hành động cần phối hợp:

1. Chỉ làm A6 sau khi chín feature scoped pass network acceptance.
2. Owner-Ops bàn giao topology private, gỡ public host port Supabase/Redis/Postgres, rồi xoay key.
3. Nhóm gỡ `NEXT_PUBLIC_SUPABASE_*`, `lib/supabase/client.ts` và legacy sync/hydrate trước khi rerun build/leakage gate.

## Hướng dẫn kiểm tra thủ công

1. Mở DevTools Network, bật Preserve log và lọc `Fetch/XHR`.
2. Login, lần lượt mở Tour Products, Daily Planner, Attraction Schedule và Tour Design.
3. Kết quả đạt chỉ chứa origin CRM, ví dụ `http://localhost:3006/api/...`; không có host Supabase, `/rest/v1`, `/auth/v1`, `/storage/v1` hoặc WebSocket Realtime.
4. Hiện tại bước 3 sẽ thất bại theo HIGH-01; trace Playwright trong `test-results/` cung cấp evidence lặp lại được.
