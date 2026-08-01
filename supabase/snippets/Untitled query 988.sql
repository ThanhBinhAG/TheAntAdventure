-- Kiểm tra toàn bộ quyền hiện có của employee@gmail.com.
select
  p.email,
  ur.role_code,
  rp.permission_code
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
join public.role_permissions rp on rp.role_code = ur.role_code
where p.email = 'employee@gmail.com'
order by rp.permission_code;