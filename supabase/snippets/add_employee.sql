-- Gán role employee cho user mới tạo.
insert into public.user_roles (user_id, role_code)
select p.id, 'employee'
from public.profiles p
where p.email = 'employee@gmail.com'
on conflict (user_id, role_code) do nothing;