-- Giữ super_admin trong database nhưng không hiển thị hoặc quản lý
-- qua màn hình Access Control.
--
-- Access Control chỉ quản lý:
-- - admin: toàn quyền cố định (*)
-- - employee: quyền cấu hình theo checkbox

-- ============================================================================
-- 1. API Role & quyền chỉ nhận về Admin và Employee.
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
  where r.code in ('admin', 'employee')
  group by r.code, r.label, r.description
  order by case r.code
    when 'admin' then 1
    when 'employee' then 2
  end;
end;
$$;

-- ============================================================================
-- 2. Không thể gán hoặc đổi sang super_admin qua RPC.
--    Đồng thời không cho sửa tài khoản super_admin đang tồn tại.
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
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền đổi role người dùng.'
      using errcode = '42501';
  end if;

  -- Chỉ hai role hiển thị trên Access Control mới được gán.
  if new_role_code not in ('admin', 'employee') then
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

  -- Không cho user tự đổi role của mình.
  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự đổi role của chính mình.'
      using errcode = '42501';
  end if;

  select role_code
  into current_role_code
  from public.user_roles
  where user_id = target_user_id;

  -- Tài khoản Super Admin là tài khoản kỹ thuật ẩn:
  -- không hiện và cũng không thao tác từ Access Control.
  if current_role_code = 'super_admin' then
    raise exception 'Không thể thay đổi tài khoản Super Admin tại đây.'
      using errcode = '42501';
  end if;

  delete from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (user_id, role_code)
  values (target_user_id, new_role_code);

  -- Lưu lịch sử đổi role.
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
-- 3. Danh sách người dùng không trả về tài khoản super_admin.
-- ============================================================================

create or replace function public.list_access_control_users_page(
  search_text text default null,
  filter_role_code text default null,
  filter_is_active boolean default null,
  page_number integer default 1,
  page_size integer default 10
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  is_active boolean,
  role_code text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_page_number integer := greatest(
    coalesce(page_number, 1),
    1
  );

  safe_page_size integer := least(
    greatest(coalesce(page_size, 10), 1),
    100
  );

  normalized_search_text text := nullif(trim(search_text), '');
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem danh sách người dùng.'
      using errcode = '42501';
  end if;

  -- Không nhận filter super_admin từ API/RPC.
  if filter_role_code is not null
    and filter_role_code not in ('admin', 'employee', 'unassigned') then
    raise exception 'Bộ lọc role không hợp lệ.'
      using errcode = '22023';
  end if;

  return query
  with filtered_users as (
    select
      p.id as user_id,
      p.email,
      p.display_name,
      p.is_active,
      ur.role_code
    from public.profiles p
    left join public.user_roles ur
      on ur.user_id = p.id
    where p.deleted_at is null
      -- is distinct from xử lý cả trường hợp role_code là null.
      and ur.role_code is distinct from 'super_admin'
      and (
        normalized_search_text is null
        or p.email ilike '%' || normalized_search_text || '%'
        or p.display_name ilike '%' || normalized_search_text || '%'
      )
      and (
        filter_role_code is null
        or (
          filter_role_code = 'unassigned'
          and ur.role_code is null
        )
        or ur.role_code = filter_role_code
      )
      and (
        filter_is_active is null
        or p.is_active = filter_is_active
      )
  )
  select
    filtered.user_id,
    filtered.email,
    filtered.display_name,
    filtered.is_active,
    filtered.role_code,
    count(*) over() as total_count
  from filtered_users filtered
  order by filtered.email nulls last
  limit safe_page_size
  offset (safe_page_number - 1) * safe_page_size;
end;
$$;

-- ============================================================================
-- 4. Thống kê đầu trang cũng không tính tài khoản super_admin.
--    Giữ cột super_admin_count = 0 tạm thời để code frontend cũ không lỗi.
-- ============================================================================

create or replace function public.get_access_control_user_summary()
returns table (
  total_users bigint,
  active_users bigint,
  super_admin_count bigint,
  admin_count bigint,
  employee_count bigint,
  unassigned_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem thống kê người dùng.'
      using errcode = '42501';
  end if;

  return query
  select
    count(*) as total_users,

    count(*) filter (
      where p.is_active = true
    ) as active_users,

    0::bigint as super_admin_count,

    count(*) filter (
      where ur.role_code = 'admin'
    ) as admin_count,

    count(*) filter (
      where ur.role_code = 'employee'
    ) as employee_count,

    count(*) filter (
      where ur.role_code is null
    ) as unassigned_count
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  where p.deleted_at is null
    and ur.role_code is distinct from 'super_admin';
end;
$$;