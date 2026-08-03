# lib/access-control/ — Agent overview

## Role
Logic phía server cho chức năng quản lý user, role và permission.

## Contents
- `server.ts` — Gọi các Supabase RPC phân quyền bằng session hiện tại.
- `audit-log-presentation.ts` — Quy đổi action audit thành nhãn tiếng Việt cho UI.

## Boundaries
- Không dùng service-role.
- Không chứa React UI hoặc Route Handler.
