# app/api/access-control/users/ — Agent overview

## Role
API danh sách user có tìm kiếm, lọc và phân trang.

## Contents
- `route.ts` — GET danh sách; POST tạo Auth user + profile + role; PATCH sửa/kích hoạt/khôi phục; DELETE xóa mềm.

## Boundaries
- Gọi RPC qua `lib/access-control`; POST được phép gọi `lib/auth/access-control-admin` để tạo Auth user.
- Không dùng service-role hoặc SQL trực tiếp.
