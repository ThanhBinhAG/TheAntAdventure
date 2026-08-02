begin;

-- Xóa role cũ của đúng user này nếu có.
-- Điều này bảo đảm V1: một user chỉ có một role.
delete from public.user_roles
where user_id = (
  select id
  from public.profiles
  where email = 'super_admin@gmail.com'
);

-- Gán role Super Admin cho user.
insert into public.user_roles (user_id, role_code)
select id,'super_admin'
from public.profiles
where email = 'super_admin@gmail.com';

commit;