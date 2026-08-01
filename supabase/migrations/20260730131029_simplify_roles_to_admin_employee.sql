-- CRM nội bộ V1 chỉ dùng hai role nghiệp vụ:
-- admin: toàn quyền nghiệp vụ.
-- employee: làm việc CRM cơ bản, không chạm dữ liệu nhạy cảm.

-- Xóa toàn bộ role cũ, ngoại trừ admin.
-- user_roles và role_permissions liên quan tự xóa nhờ ON DELETE CASCADE.
delete from public.roles
where code <> 'admin';

-- Wildcard (*) chỉ phục vụ super_admin cũ, không còn cần trong database.
delete from public.permissions
where code = '*';

-- Tạo role nhân viên.
insert into public.roles (code, label, description)
values ('employee', 'Nhân viên', 'Nhân viên CRM nội bộ')
on conflict (code) do update
set
  label = excluded.label,
  description = excluded.description;

-- Đảm bảo admin có tất cả permission đang tồn tại.
insert into public.role_permissions (role_code, permission_code)
select 'admin', code
from public.permissions
on conflict do nothing;

-- Quyền cơ bản cho nhân viên.
insert into public.role_permissions (role_code, permission_code)
select 'employee', code
from public.permissions
where code in (
  'dashboard.read',
  'company.read',

  'customers.read',
  'customers.write',
  'agents.read',

  'sales.read',
  'sales.write',
  'tour_design.read',
  'tour_design.write',

  'catalogue.read',
  'pricing.read',
  'operations.read',

  'weather.read',
  'teamchat.read',
  'teamchat.write'
)
on conflict do nothing;