insert into public.user_roles (user_id, role_code)
select p.id, 'admin'
from public.profiles p
where p.email = 'admin@gmail.com'
on conflict (user_id, role_code) do nothing;