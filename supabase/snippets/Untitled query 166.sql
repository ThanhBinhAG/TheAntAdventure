select
  au.email,
  p.is_active,
  ur.role_code
from auth.users au
join public.profiles p on p.id = au.id
left join public.user_roles ur on ur.user_id = p.id
where au.email = 'employee@gmail.com';