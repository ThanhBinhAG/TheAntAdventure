# components/access-control/ — Agent overview

## Role
Giao diện Quản lý người dùng và phân quyền dành cho tài khoản có users.manage.

## Contents
- `UserDirectory.tsx` — danh sách user phân trang.
- `UserAccessDrawer.tsx` — xem quyền hiệu lực và đổi role.
- `RolesPermissionsTab.tsx` — cấu hình permission theo role.
- `AuditLogsTab.tsx` — lịch sử đổi role và permission.
- `access-control-api.ts` — client gọi API Access Control.
- `UserActionsMenu.tsx` — menu thao tác nhanh: sửa thông tin, trạng thái và xóa mềm.
- `UserEditDrawer.tsx` — sửa tên hiển thị của user.
- `UserCreateDrawer.tsx` — tạo Auth user mới, tên hiển thị và role ban đầu.
- `useRefreshAccessControlAuditLogs.ts` — làm mới cache lịch sử sau thao tác ghi dữ liệu.

## Boundaries
- Chỉ hiển thị và gọi API.
- Không truy cập Supabase hoặc kiểm tra SQL trực tiếp.
