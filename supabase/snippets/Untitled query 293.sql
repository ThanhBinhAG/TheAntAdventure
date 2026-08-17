begin;

delete from public.user_roles
where user_id = (
  select id from public.profiles
  where email = 'dev.local@admin.com'
);

insert into public.user_roles (user_id, role_code)
select id, 'super_admin'
from public.profiles
where email = 'dev.local@admin.com';

commit;