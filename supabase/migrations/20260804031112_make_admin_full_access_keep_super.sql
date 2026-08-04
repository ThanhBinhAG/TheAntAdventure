-- Admin và Super Admin đều có toàn quyền bằng permission wildcard (*).
-- Super Admin vẫn được giữ trong database để tương thích dữ liệu cũ,
-- nhưng các bước code sau sẽ không cho nó xuất hiện trong Access Control.

begin;

-- 1. Xóa các quyền rời rạc cũ của Admin.
-- Sau bước này Admin chỉ cần permission "*" là đủ toàn quyền.
delete from public.role_permissions
where role_code = 'admin';

-- 2. Cấp wildcard cho Admin.
-- has_permission() sẽ coi "*" là hợp lệ cho mọi permission được yêu cầu.
insert into public.role_permissions (role_code, permission_code)
values ('admin', '*')
on conflict do nothing;

-- 3. Chỉ cho phép chỉnh checkbox quyền của Employee.
-- Admin và Super Admin là các role toàn quyền cố định, không được sửa nhầm
-- bằng giao diện Role & quyền.
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
  -- Chỉ người có users.manage mới được sửa quyền role.
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền đổi permission của role.'
      using errcode = '42501';
  end if;

  -- Chỉ Employee được cấu hình bằng checkbox trên UI.
  if target_role_code <> 'employee' then
    raise exception 'Chỉ được chỉnh permission của Nhân viên.'
      using errcode = '22023';
  end if;

  -- Không nhận wildcard (*) và users.manage từ UI.
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

  -- Lưu danh sách cũ để ghi audit log.
  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into old_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  -- Thay toàn bộ quyền Employee bằng danh sách mới từ giao diện.
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

  -- Lấy danh sách mới để ghi lịch sử.
  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into new_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  -- Ghi lại thay đổi để tab Lịch sử hiển thị được.
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

commit;