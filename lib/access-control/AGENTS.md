# lib/access-control/ — Agent overview

## Role
Logic phía server cho chức năng quản lý user, role và permission.

## Contents
- `server.ts` — Gọi các Supabase RPC phân quyền bằng session hiện tại.
- `audit-log-presentation.ts` — Quy đổi action audit thành nhãn tiếng Việt cho UI.
- `permission-input.ts` — schema kiểm tra payload tạo permission tại API.
- `staff-role-error.ts` — Chuẩn hóa lỗi RPC role nhân viên thành HTTP status và thông báo an toàn.

## Boundaries
- Không dùng service-role.
- Không chứa React UI hoặc Route Handler.
