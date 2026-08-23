# lib/bff/ — Agent overview

## Role
Thư mục này chứa các BFF request primitives và helpers dùng chung để xử lý và chuẩn hóa các Next.js API Routes (Route Handlers) gọi đến cơ sở dữ liệu Supabase nội bộ.

## Contents
- `route.ts` — BFF Route handler wrapper (`bffRoute`), tích hợp phân quyền, Zod validation, session lookup, và quản lý lỗi/kết quả phản hồi chuẩn hóa.

## Boundaries
- File trong thư mục này chỉ được chạy ở môi trường **server-only** (sẽ import 'server-only').
- Không import bất kỳ file nào từ `components/` hoặc `app/` (ngoại trừ các types nếu cần thiết).
- Không tự ý thực thi các query trực tiếp vào DB; mọi tác vụ DB/Storage phải ủy thác cho các domain repositories hoặc server-only Supabase client.
