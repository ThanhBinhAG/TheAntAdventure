-- Gán role employee cho user (đổi email cho đúng).
-- Điều kiện: migration RBAC đã chạy; user đã có trong Auth (+ profiles).
insert into public.user_roles (user_id, role_code)
select p.id, 'employee'
from public.profiles p
where lower(p.email) = lower('employee@gmail.com')
on conflict (user_id, role_code) do nothing;
