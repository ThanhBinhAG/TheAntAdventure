-- Gán user info@theantadventures.com → role sales_product
-- (chỉ menu / trang nhóm Sales & Product — theo RBAC của feat/auth).
--
-- Điều kiện:
--   1. User đã tồn tại trong Authentication (email đúng).
--   2. Migration RBAC đã chạy (có bảng profiles, roles, permissions, …).
--   3. App đã map planner → sales.read (không dùng operations.read),
--      để Planner hiện trong Sales & Product mà không mở cả nhóm Operations.
--
-- Chạy trong Supabase SQL Editor (một lần là đủ; có on conflict).

-- 1) Role hẹp: Sales & Product
insert into public.roles (code, label, description)
values (
  'sales_product',
  'Sales & Product',
  'Khách / user chỉ dùng nhóm menu Sales & Product'
)
on conflict (code) do update
set
  label = excluded.label,
  description = excluded.description;

-- 2) Quyền gắn role (chỉ permission đã có trong public.permissions)
insert into public.role_permissions (role_code, permission_code)
select 'sales_product', code
from public.permissions
where code in (
  'dashboard.read',

  'customers.read',
  'customers.write',
  'agents.read',
  'agents.write',

  'sales.read',
  'sales.write',
  'tour_design.read',
  'tour_design.write',
  'tour_design.export',

  'catalogue.read',
  'catalogue.write',

  'pricing.read',
  'pricing.export',

  'weather.read'
)
on conflict do nothing;

-- 3) Đảm bảo có profile (trigger thường đã tạo; dòng này phòng hờ)
insert into public.profiles (id, email)
select id, email
from auth.users
where lower(email) = lower('info@theantadventures.com')
on conflict (id) do update set email = excluded.email;

-- 4) Bỏ role khác nếu đã gán nhầm (admin / employee)
delete from public.user_roles ur
using public.profiles p
where ur.user_id = p.id
  and lower(p.email) = lower('info@theantadventures.com')
  and ur.role_code <> 'sales_product';

-- 5) Gán sales_product
insert into public.user_roles (user_id, role_code)
select p.id, 'sales_product'
from public.profiles p
where lower(p.email) = lower('info@theantadventures.com')
on conflict (user_id, role_code) do nothing;

-- 6) Kiểm tra
select
  p.email,
  ur.role_code,
  array_agg(rp.permission_code order by rp.permission_code) as permissions
from public.profiles p
join public.user_roles ur on ur.user_id = p.id
join public.role_permissions rp on rp.role_code = ur.role_code
where lower(p.email) = lower('info@theantadventures.com')
group by p.email, ur.role_code;
