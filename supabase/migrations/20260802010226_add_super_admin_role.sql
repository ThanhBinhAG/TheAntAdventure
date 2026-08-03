-- Thêm role Super Admin cho CRM.
--
-- Mục tiêu:
-- - super_admin có toàn quyền hệ thống thông qua permission `*`.
-- - admin vẫn có toàn quyền nghiệp vụ CRM, nhưng không được quản lý user/role.
-- - Việc gán email cụ thể vào super_admin sẽ làm ở bước tiếp theo,
--   không ghi cứng email trong migration.

-- 1. Tạo role Super Admin.
insert into public.roles (code, label, description)
values (
  'super_admin',
  'Super Admin',
  'Quản trị hệ thống và phân quyền người dùng'
)
on conflict (code) do update
set
  label = excluded.label,
  description = excluded.description;

-- 2. Khôi phục permission wildcard `*`.
-- Permission này nghĩa là: có toàn bộ quyền hiện tại và quyền được kiểm tra
-- bằng hasPermission()/has_permission() trong hệ thống.
insert into public.permissions (code, description)
values ('*', 'Toàn quyền hệ thống')
on conflict (code) do update
set description = excluded.description;

-- 3. Gán wildcard cho Super Admin.
insert into public.role_permissions (role_code, permission_code)
values ('super_admin', '*')
on conflict do nothing;

-- 4. Admin không được quản lý phân quyền/user.
-- Quyền users.manage chỉ dành cho Super Admin.
delete from public.role_permissions
where role_code = 'admin'
  and permission_code = 'users.manage';