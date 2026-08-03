-- Bảo vệ permission hệ thống khỏi UI Role & quyền.
--
-- Quy tắc:
-- - users.manage chỉ dành cho super_admin.
-- - super_admin có wildcard (*) và không sửa permission qua UI.
-- - admin/employee không được gán users.manage bằng API hoặc SQL RPC.

-- Dọn dữ liệu cũ phòng trường hợp users.manage từng được gán nhầm.
delete from public.role_permissions
where role_code in ('admin', 'employee')
  and permission_code = 'users.manage';

-- Không trả permission hệ thống lên giao diện checkbox.
create or replace function public.list_access_control_permissions()
returns table (
  permission_code text,
  permission_description text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền quản lý phân quyền.'
      using errcode = '42501';
  end if;

  return query
  select
    p.code,
    p.description
  from public.permissions p
  where p.code not in ('*', 'users.manage')
  order by p.code;
end;
$$;

-- Không cho API gán users.manage hoặc wildcard cho admin/employee.
create or replace function public.replace_role_permissions(
  target_role_code text,
  requested_permission_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_permission_codes text[];
  new_permission_codes text[];
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền đổi permission của role.'
      using errcode = '42501';
  end if;

  -- Chỉ chỉnh role nghiệp vụ; Super Admin là role hệ thống cố định.
  if target_role_code not in ('admin', 'employee') then
    raise exception 'Chỉ được chỉnh permission của admin hoặc employee.'
      using errcode = '22023';
  end if;

  -- Chặn các permission hệ thống và permission không tồn tại.
  if exists (
    select 1
    from unnest(
      coalesce(requested_permission_codes, array[]::text[])
    ) as requested(permission_code)
    where requested.permission_code in ('*', 'users.manage')
      or not exists (
        select 1
        from public.permissions p
        where p.code = requested.permission_code
      )
  ) then
    raise exception 'Danh sách permission không hợp lệ.'
      using errcode = '22023';
  end if;

  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into old_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  delete from public.role_permissions
  where role_code = target_role_code;

  insert into public.role_permissions (role_code, permission_code)
  select
    target_role_code,
    requested.permission_code
  from (
    select distinct permission_code
    from unnest(
      coalesce(requested_permission_codes, array[]::text[])
    ) as input(permission_code)
  ) as requested;

  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into new_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  insert into public.access_control_audit_logs (
    actor_user_id,
    action,
    before_value,
    after_value
  )
  values (
    auth.uid(),
    'role_permissions_replaced',
    jsonb_build_object(
      'role_code', target_role_code,
      'permission_codes', old_permission_codes
    ),
    jsonb_build_object(
      'role_code', target_role_code,
      'permission_codes', new_permission_codes
    )
  );
end;
$$;