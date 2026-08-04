-- Giai đoạn 4:
-- Danh sách user và thao tác gán role dùng được mọi role nghiệp vụ động.
-- Không tạo bảng mới.

-- ============================================================================
-- 1. Lọc user theo mọi role đang tồn tại, nhưng vẫn ẩn super_admin.
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
  safe_page_number integer := greatest(coalesce(page_number, 1), 1);
  safe_page_size integer := least(greatest(coalesce(page_size, 10), 1), 100);
  normalized_search_text text := nullif(trim(search_text), '');
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem danh sách người dùng.'
      using errcode = '42501';
  end if;

  -- Super Admin là tài khoản kỹ thuật, không lọc hay hiển thị từ UI.
  if filter_role_code = 'super_admin' then
    raise exception 'Bộ lọc role không hợp lệ.'
      using errcode = '22023';
  end if;

  -- Cho phép lọc role đang tồn tại, kể cả role đã ngừng dùng.
  -- Role ngừng dùng vẫn cần được hiển thị cho các user cũ.
  if filter_role_code is not null
    and filter_role_code <> 'unassigned'
    and not exists (
      select 1
      from public.roles
      where code = filter_role_code
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
-- 2. Chỉ Admin hoặc role nghiệp vụ đang hoạt động mới được gán cho user.
-- Employee cũng đi qua quy tắc này như Sale, Điều hành, ...
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

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
      and deleted_at is null
  ) then
    raise exception 'Không tìm thấy người dùng.'
      using errcode = '22023';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự đổi role của chính mình.'
      using errcode = '42501';
  end if;

  select role_code
  into current_role_code
  from public.user_roles
  where user_id = target_user_id;

  -- Không thao tác tài khoản Dev ẩn.
  if current_role_code = 'super_admin'
    or new_role_code = 'super_admin' then
    raise exception 'Không thể thay đổi tài khoản hoặc role Super Admin tại đây.'
      using errcode = '42501';
  end if;

  -- Admin là role hệ thống toàn quyền.
  -- Các role khác phải là role nghiệp vụ đang hoạt động, gồm cả employee.
  if new_role_code <> 'admin'
    and not exists (
      select 1
      from public.roles
      where code = new_role_code
        and is_system = false
        and is_active = true
    ) then
    raise exception 'Role không tồn tại hoặc đã ngừng sử dụng.'
      using errcode = '22023';
  end if;

  -- Hàm chạy trong một transaction: nếu insert lỗi, lệnh delete cũng tự rollback.
  delete from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (user_id, role_code)
  values (target_user_id, new_role_code);

  -- Lưu lịch sử thay đổi role.
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