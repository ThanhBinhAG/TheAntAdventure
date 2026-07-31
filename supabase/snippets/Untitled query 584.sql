-- Kiểm tra employee đã có quyền thao tác Operations chưa.
select
  p.email,
  ur.role_code,
  rp.permission_code
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
join public.role_permissions rp on rp.role_code = ur.role_code
where p.email = 'employee@gmail.com'
  and rp.permission_code = 'operations.write';