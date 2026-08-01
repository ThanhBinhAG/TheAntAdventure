insert into public.user_roles (user_id, role_code)
select id, 'admin'
from auth.users
where email = 'admin@gmail.com'
returning user_id, role_code;