-- Employee là role nhân viên bình thường, có thể cấu hình quyền từ UI.
-- Chỉ admin và super_admin là role hệ thống cố định.

update public.roles
set
  is_system = false,
  is_active = true,
  sort_order = 0
where code = 'employee';