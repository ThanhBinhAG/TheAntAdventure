-- Bổ sung quyền của chức vụ vào permission hiệu lực của user.
--
-- Quyền hiệu lực:
-- 1. Permission của role hiện tại.
-- 2. Permission của chức vụ, nếu Employee đã được phân công.
--
-- Admin/Super Admin vẫn có wildcard (*) từ role của họ.

create or replace function public.current_permission_codes()
returns table (code text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct granted_permissions.permission_code as code
  from (
    -- Permission cấp trực tiếp từ role: admin, employee, super_admin.
    select rp.permission_code
    from public.profiles p
    join public.user_roles ur
      on ur.user_id = p.id
    join public.role_permissions rp
      on rp.role_code = ur.role_code
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null

    union

    -- Permission cộng thêm từ chức vụ của Employee.
    select pp.permission_code
    from public.profiles p
    join public.user_positions up
      on up.user_id = p.id
    join public.position_permissions pp
      on pp.position_code = up.position_code
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null
  ) as granted_permissions;
$$;