-- Bổ sung RPC phân trang cho màn hình quản lý user.
--
-- Mục tiêu:
-- - Không tải toàn bộ user khi số nhân viên tăng.
-- - Hỗ trợ tìm theo tên/email, lọc role và trạng thái.
-- - Trả về số liệu tổng quan để hiển thị trên UI.
--
-- Lưu ý:
-- - Các hàm chỉ đọc dữ liệu.
-- - Vẫn kiểm tra users.manage để chỉ Super Admin gọi được.

-- Index hỗ trợ lọc/count user theo role.
create index if not exists idx_user_roles_role_code
  on public.user_roles (role_code);

-- ============================================================================
-- 1. Lấy danh sách user theo trang.
-- ============================================================================

create function public.list_access_control_users_page(
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
  -- Ép page tối thiểu là 1, page size từ 1 đến 100.
  safe_page_number integer := greatest(coalesce(page_number, 1), 1);
  safe_page_size integer := least(
    greatest(coalesce(page_size, 10), 1),
    100
  );

  -- Biến search rỗng được đổi thành null để không lọc.
  normalized_search_text text := nullif(trim(search_text), '');
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem danh sách người dùng.'
      using errcode = '42501';
  end if;

  -- Chỉ chấp nhận những role/filter hợp lệ.
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
    where
      (
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
    f.user_id,
    f.email,
    f.display_name,
    f.is_active,
    f.role_code,

    -- Tổng số user sau khi lọc, trước khi phân trang.
    count(*) over() as total_count
  from filtered_users f
  order by f.email nulls last
  limit safe_page_size
  offset (safe_page_number - 1) * safe_page_size;
end;
$$;

-- ============================================================================
-- 2. Lấy số liệu tổng quan cho header UI.
-- ============================================================================

create function public.get_access_control_user_summary()
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
    on ur.user_id = p.id;
end;
$$;

-- ============================================================================
-- 3. Chỉ session đã đăng nhập mới gọi được RPC.
-- Database vẫn kiểm tra users.manage ở bên trong mỗi hàm.
-- ============================================================================

revoke all on function public.list_access_control_users_page(
  text,
  text,
  boolean,
  integer,
  integer
) from public;

revoke all on function public.get_access_control_user_summary()
from public;

grant execute on function public.list_access_control_users_page(
  text,
  text,
  boolean,
  integer,
  integer
) to authenticated;

grant execute on function public.get_access_control_user_summary()
to authenticated;