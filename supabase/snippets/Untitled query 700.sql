select p.email, ur.role_code
from public.profiles p
join public.user_roles ur on ur.user_id = p.id;