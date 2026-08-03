-- Chuẩn bị vòng đời tài khoản cho Access Control.
--
-- Chức năng:
-- - Thêm deleted_at để hỗ trợ xóa mềm tài khoản.
-- - User đã xóa không còn permission.
-- - Danh sách và thống kê mặc định không hiển thị user đã xóa.
--
-- Lưu ý:
-- - Chưa có thao tác xóa ở migration này.
-- - RPC xóa/khôi phục sẽ được thêm ở bước sau.

-- ============================================================================
-- 1. Thêm mốc thời gian xóa mềm.
-- ============================================================================

alter table public.profiles
add column if not exists deleted_at timestamptz null;

comment on column public.profiles.deleted_at is
  'Thời điểm xóa mềm. Null nghĩa là tài khoản vẫn xuất hiện bình thường.';

-- ============================================================================
-- 2. User đã xóa không còn permission.
-- ============================================================================
-- Hàm này được dùng ở cả frontend permission API và các RPC bảo mật.

create or replace function public.current_permission_codes()
returns table (code text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct rp.permission_code
  from public.user_roles ur
  join public.profiles p
    on p.id = ur.user_id
  join public.role_permissions rp
    on rp.role_code = ur.role_code
  where ur.user_id = auth.uid()
    and p.is_active = true
    and p.deleted_at is null;
$$;

-- ============================================================================
-- 3. Danh sách user chỉ lấy tài khoản chưa bị xóa mềm.
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

  normalized_search_text text := nullif(
    trim(search_text),
    ''
  );
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem danh sách người dùng.'
      using errcode = '42501';
  end if;

  if filter_role_code is not null
    and filter_role_code not in (
      'super_admin',
      'admin',
      'employee',
      'unassigned'
    ) then
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
-- 4. Thống kê đầu trang cũng không tính user đã xóa mềm.
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

    count(*) filter (
      where ur.role_code = 'super_admin'
    ) as super_admin_count,

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
  where p.deleted_at is null;
end;
$$;