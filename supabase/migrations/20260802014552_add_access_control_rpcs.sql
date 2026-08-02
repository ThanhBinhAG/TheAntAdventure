-- Chuẩn bị các hàm database cho màn hình Quản lý người dùng & phân quyền.
--
-- Quy tắc:
-- - CRM V1: mỗi user chỉ có một role.
-- - Chỉ người có users.manage (hiện là super_admin) được quản lý quyền.
-- - Không sửa permission của super_admin từ giao diện.
-- - Mọi thay đổi role/quyền đều được ghi audit log.

-- ============================================================================
-- 1. Ràng buộc: mỗi user chỉ được có một role trong CRM V1.
-- ============================================================================

alter table public.user_roles
add constraint user_roles_one_role_per_user unique (user_id);

-- ============================================================================
-- 2. Bảng lịch sử thay đổi quyền.
-- ============================================================================

create table public.access_control_audit_logs (
  id bigint generated always as identity primary key,

  -- User thực hiện thay đổi. Dùng SET NULL để giữ log nếu user bị xóa sau này.
  actor_user_id uuid references public.profiles(id) on delete set null,

  -- User bị đổi role. Null khi log là thay đổi permission của role.
  target_user_id uuid references public.profiles(id) on delete set null,

  -- Ví dụ: user_role_changed, role_permissions_replaced.
  action text not null,

  -- Dữ liệu trước và sau khi thay đổi.
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index idx_access_control_audit_logs_created_at
  on public.access_control_audit_logs (created_at desc);

create index idx_access_control_audit_logs_target_user_id
  on public.access_control_audit_logs (target_user_id);

alter table public.access_control_audit_logs enable row level security;

-- Không tạo policy đọc trực tiếp.
-- Sau này nếu cần tab Lịch sử, ta sẽ tạo RPC/API có kiểm tra users.manage.

-- ============================================================================
-- 3. Hàm lấy danh sách user và role hiện tại.
-- ============================================================================

create or replace function public.list_access_control_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  is_active boolean,
  role_code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Chỉ Super Admin mới được xem danh sách quản trị user.
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền quản lý người dùng.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.is_active,
    ur.role_code
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  order by p.email nulls last;
end;
$$;

-- ============================================================================
-- 4. Hàm lấy role và các permission thuộc role đó.
-- ============================================================================

create or replace function public.list_access_control_roles()
returns table (
  role_code text,
  role_label text,
  role_description text,
  permission_codes text[]
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
    r.code,
    r.label,
    r.description,
    coalesce(
      array_agg(rp.permission_code order by rp.permission_code)
        filter (where rp.permission_code is not null),
      array[]::text[]
    )
  from public.roles r
  left join public.role_permissions rp
    on rp.role_code = r.code
  where r.code in ('super_admin', 'admin', 'employee')
  group by r.code, r.label, r.description
  order by case r.code
    when 'super_admin' then 1
    when 'admin' then 2
    when 'employee' then 3
    else 4
  end;
end;
$$;

-- ============================================================================
-- 5. Hàm lấy permission có thể hiển thị/chỉnh sửa trên giao diện.
-- ============================================================================

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

  -- Không trả permission "*" lên checkbox UI.
  -- "*" là toàn quyền cố định của Super Admin.
  return query
  select
    p.code,
    p.description
  from public.permissions p
  where p.code <> '*'
  order by p.code;
end;
$$;

-- ============================================================================
-- 6. Hàm đổi role của một user.
-- ============================================================================

create or replace function public.set_user_role(
  target_user_id uuid,
  new_role_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role_code text;
  super_admin_count integer;
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền đổi role người dùng.'
      using errcode = '42501';
  end if;

  -- Chỉ nhận ba role nghiệp vụ của CRM.
  if new_role_code not in ('super_admin', 'admin', 'employee') then
    raise exception 'Role không hợp lệ.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
  ) then
    raise exception 'Không tìm thấy người dùng.'
      using errcode = '22023';
  end if;

  -- Không cho Super Admin tự hạ quyền, tránh tự khóa tài khoản quản trị.
  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự đổi role của chính mình.'
      using errcode = '42501';
  end if;

  select role_code
  into current_role_code
  from public.user_roles
  where user_id = target_user_id;

  -- Không cho hạ cấp Super Admin cuối cùng.
  if current_role_code = 'super_admin'
    and new_role_code <> 'super_admin' then

    select count(*)
    into super_admin_count
    from public.user_roles
    where role_code = 'super_admin';

    if super_admin_count <= 1 then
      raise exception 'Không thể hạ cấp Super Admin cuối cùng.'
        using errcode = '42501';
    end if;
  end if;

  -- Thay role cũ bằng role mới.
  delete from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (user_id, role_code)
  values (target_user_id, new_role_code);

  -- Ghi lịch sử thay đổi.
  insert into public.access_control_audit_logs (
    actor_user_id,
    target_user_id,
    action,
    before_value,
    after_value
  )
  values (
    auth.uid(),
    target_user_id,
    'user_role_changed',
    jsonb_build_object('role_code', current_role_code),
    jsonb_build_object('role_code', new_role_code)
  );
end;
$$;

-- ============================================================================
-- 7. Hàm thay toàn bộ permission của một role.
-- ============================================================================

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

  -- Super Admin luôn có wildcard "*", không sửa qua UI.
  if target_role_code not in ('admin', 'employee') then
    raise exception 'Chỉ được chỉnh permission của admin hoặc employee.'
      using errcode = '22023';
  end if;

  -- Kiểm tra toàn bộ permission frontend gửi lên có tồn tại hay không.
  if exists (
    select 1
    from unnest(
      coalesce(requested_permission_codes, array[]::text[])
    ) as requested(permission_code)
    where requested.permission_code = '*'
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

  -- Xóa bộ permission cũ của role.
  delete from public.role_permissions
  where role_code = target_role_code;

  -- Gán bộ permission mới.
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

  -- Ghi lịch sử thay đổi quyền của role.
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

-- ============================================================================
-- 8. Chỉ user đã đăng nhập mới được gọi RPC.
-- Bản thân từng RPC vẫn kiểm tra users.manage ở phía trên.
-- ============================================================================

revoke all on function public.list_access_control_users() from public;
revoke all on function public.list_access_control_roles() from public;
revoke all on function public.list_access_control_permissions() from public;
revoke all on function public.set_user_role(uuid, text) from public;
revoke all on function public.replace_role_permissions(text, text[]) from public;

grant execute on function public.list_access_control_users() to authenticated;
grant execute on function public.list_access_control_roles() to authenticated;
grant execute on function public.list_access_control_permissions() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.replace_role_permissions(text, text[]) to authenticated;