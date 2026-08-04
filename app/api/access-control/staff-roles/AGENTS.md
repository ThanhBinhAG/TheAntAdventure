# app/api/access-control/staff-roles — Agent overview

## Role

API quản lý role nhân viên động trong Access Control.

## Contents

- `route.ts` — đọc, tạo, sửa/vô hiệu hóa role và lưu permission.

## Boundaries

- Luôn kiểm tra users.manage.
- Chỉ gọi server service trong lib/access-control.
- Không cho role nhân viên có wildcard (*) hoặc users.manage.