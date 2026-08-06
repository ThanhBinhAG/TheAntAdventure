# app/api/access-control/ — Agent overview

## Role
API cho màn hình Quản lý người dùng & phân quyền.

## Contents
- `route.ts` — GET dữ liệu, PATCH thay đổi role/permission và POST tạo permission cho Super Admin.
- `audit-logs/` — GET lịch sử thay đổi role và permission.
- `users/` — CRUD tài khoản, gán role ban đầu và phân trang danh sách user.

## Boundaries
- Route Handler chỉ kiểm tra request và gọi lib.
- Không tự truy cập service-role hoặc SQL trực tiếp.
