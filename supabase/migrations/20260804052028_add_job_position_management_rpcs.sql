-- RPC quản lý chức vụ động.
-- Chỉ tài khoản có users.manage mới dùng được.

-- ============================================================================
-- 1. Lấy danh sách chức vụ và permission hiện có.
-- ============================================================================

create or replace function public.list_access_control_job_positions()
returns table (
  position_code text,
  position_label text,
  position_description text,
  is_active boolean,
  sort_order integer,
  permission_codes text[],
  assigned_user_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền quản lý chức vụ.'
      using errcode = '42501';
  end if;

  return query
  select
    jp.code,
    jp.label,
    jp.description,
    jp.is_active,
    jp.sort_order,
    coalesce(
      array_agg(pp.permission_code order by pp.permission_code)
        filter (where pp.permission_code is not null),
      array[]::text[]
    ),
    count(distinct up.user_id)
  from public.job_positions jp
  left join public.position_permissions pp
    on pp.position_code = jp.code
  left join public.user_positions up
    on up.position_code = jp.code
  group by
    jp.code,
    jp.label,
    jp.description,
    jp.is_active,
    jp.sort_order
  order by jp.is_active desc, jp.sort_order, jp.label;
end;
$$;

-- ============================================================================
-- 2. Tạo chức vụ mới từ giao diện.
-- ============================================================================

create or replace function public.create_access_control_job_position(
  input_code text,
  input_label text,
  input_description text default null,
  input_sort_order integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền tạo chức vụ.'
      using errcode = '42501';
  end if;

  if input_code !~ '^[a-z0-9_]{2,50}$' then
    raise exception 'Mã chức vụ không hợp lệ.'
      using errcode = '22023';
  end if;

  if length(trim(input_label)) = 0 then
    raise exception 'Tên chức vụ không được để trống.'
      using errcode = '22023';
  end if;

  insert into public.job_positions (
    code,
    label,
    description,
    sort_order
  )
  values (
    input_code,
    trim(input_label),
    nullif(trim(input_description), ''),
    coalesce(input_sort_order, 0)
  );
end;
$$;

-- ============================================================================
-- 3. Sửa tên/mô tả/thứ tự hoặc vô hiệu hóa chức vụ.
-- ============================================================================

create or replace function public.update_access_control_job_position(
  target_code text,
  new_label text,
  new_description text,
  new_sort_order integer,
  new_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền cập nhật chức vụ.'
      using errcode = '42501';
  end if;

  if length(trim(new_label)) = 0 then
    raise exception 'Tên chức vụ không được để trống.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.job_positions where code = target_code
  ) then
    raise exception 'Không tìm thấy chức vụ.'
      using errcode = '22023';
  end if;

  update public.job_positions
  set
    label = trim(new_label),
    description = nullif(trim(new_description), ''),
    sort_order = coalesce(new_sort_order, 0),
    is_active = new_is_active,
    updated_at = now()
  where code = target_code;
end;
$$;

-- ============================================================================
-- 4. Thay permission của một chức vụ.
-- ============================================================================

create or replace function public.replace_job_position_permissions(
  target_position_code text,
  requested_permission_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền cập nhật quyền chức vụ.'
      using errcode = '42501';
  end if;

  -- Chức vụ không được có wildcard hoặc quyền quản lý Access Control.
  if exists (
    select 1
    from unnest(coalesce(requested_permission_codes, array[]::text[]))
      as requested(permission_code)
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

  delete from public.position_permissions
  where position_code = target_position_code;

  insert into public.position_permissions (
    position_code,
    permission_code
  )
  select
    target_position_code,
    distinct_permission_code
  from (
    select distinct permission_code as distinct_permission_code
    from unnest(
      coalesce(requested_permission_codes, array[]::text[])
    ) as input(permission_code)
  ) as requested;
end;
$$;

-- ============================================================================
-- 5. Gán hoặc bỏ chức vụ của Employee.
-- ============================================================================

create or replace function public.set_access_control_user_position(
  target_user_id uuid,
  new_position_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role_code text;
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền phân công chức vụ.'
      using errcode = '42501';
  end if;

  select role_code
  into target_role_code
  from public.user_roles
  where user_id = target_user_id;

  if target_role_code <> 'employee' then
    raise exception 'Chỉ có thể gán chức vụ cho Nhân viên.'
      using errcode = '22023';
  end if;

  if new_position_code is null then
    delete from public.user_positions
    where user_id = target_user_id;

    return;
  end if;

  if not exists (
    select 1
    from public.job_positions
    where code = new_position_code
      and is_active = true
  ) then
    raise exception 'Chức vụ không tồn tại hoặc đã ngừng sử dụng.'
      using errcode = '22023';
  end if;

  insert into public.user_positions (
    user_id,
    position_code,
    assigned_at,
    assigned_by
  )
  values (
    target_user_id,
    new_position_code,
    now(),
    auth.uid()
  )
  on conflict (user_id) do update
  set
    position_code = excluded.position_code,
    assigned_at = excluded.assigned_at,
    assigned_by = excluded.assigned_by;
end;
$$;