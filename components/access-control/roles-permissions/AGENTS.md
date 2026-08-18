# components/access-control/roles-permissions/ — Agent overview

## Role
Component con hiển thị giao diện phân quyền theo nhóm tính năng và phạm vi RLS cho mô-đun Access Control.

## Contents
- `RolesSidebar.tsx` — render sidebar danh sách role bên trái.
- `PermissionsTabContent.tsx` — render tab cấu hình danh sách quyền chức năng.
- `ResourceScopesTabContent.tsx` — render tab cấu hình phạm vi dữ liệu RLS.

## Boundaries
- Chỉ hiển thị dữ liệu và bắt sự kiện của người dùng, không tự quản lý state nghiệp vụ hoặc gọi API trực tiếp.
- Dữ liệu và callback được truyền xuống thông qua props từ các custom hooks ở cấp cha.
