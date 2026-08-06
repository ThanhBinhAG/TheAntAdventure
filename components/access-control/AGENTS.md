# components/access-control/ — Agent overview

## Role
Giao diện Quản lý người dùng và phân quyền dành cho tài khoản có users.manage.

## Contents
- `UserDirectory.tsx` — danh sách user phân trang.
- `UserAccessDrawer.tsx` — xem quyền hiệu lực và đổi role.
- `RolesPermissionsTab.tsx` — cấu hình permission theo role.
- `PermissionCreateDrawer.tsx` — form Super Admin thêm nhóm và permission vào catalog database.
- `role-permission-ui.ts` — helper UI thuần cho bỏ bản nháp, tổng quyền và lọc catalog quyền.
- `AuditLogsTab.tsx` — lịch sử đổi role và permission.
- `access-control-api.ts` — client gọi API Access Control.
- `UserActionsMenu.tsx` — menu thao tác nhanh: sửa thông tin, trạng thái và xóa mềm.
- `UserEditDrawer.tsx` — sửa tên hiển thị của user.
- `UserCreateDrawer.tsx` — tạo Auth user mới, tên hiển thị và role ban đầu.
- `useRefreshAccessControlAuditLogs.ts` — làm mới cache lịch sử sau thao tác ghi dữ liệu.

## Boundaries
- Chỉ hiển thị và gọi API.
- Không truy cập Supabase hoặc kiểm tra SQL trực tiếp.
