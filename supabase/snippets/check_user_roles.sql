-- Kiểm tra role + permission của một user (đổi email bên dưới).
-- Chạy trong SQL Editor sau khi gán admin / employee / sales_product.

-- 1) User Auth gần đây
select id, email, created_at
from auth.users
order by created_at desc
limit 20;

-- 2) Role đang gán
select p.email, ur.role_code, p.is_active
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
order by p.email;

-- 3) Chi tiết permission (đổi email)
select
  p.email,
  ur.role_code,
  rp.permission_code
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
join public.role_permissions rp on rp.role_code = ur.role_code
where lower(p.email) = lower('info@theantadventures.com')
order by rp.permission_code;
