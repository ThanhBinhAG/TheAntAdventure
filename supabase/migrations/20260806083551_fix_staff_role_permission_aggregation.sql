-- ============================================================================
-- Sửa RPC lấy role nhân viên để không nhân đôi permission.
--
-- Lỗi cũ:
-- Một role có N quyền và được gán cho M người dùng sẽ tạo N × M dòng khi JOIN.
-- Vì vậy UI có thể hiển thị 40 quyền dù role thực tế chỉ có 20 quyền.
--
-- Cách sửa:
-- Tách việc lấy permission và đếm user thành hai LATERAL subquery độc lập.
-- Không thay đổi bảng, role, user_roles hay role_permissions hiện có.
-- ============================================================================

create or replace function public.list_access_control_staff_roles()
returns table (
  role_code text,
  role_label text,
  role_description text,
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
  -- Chỉ người có quyền quản lý user mới được đọc danh sách role nhân viên.
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền quản lý role nhân viên.'
      using errcode = '42501';
  end if;

  return query
  select
    r.code,
    r.label,
    r.description,
    r.is_active,
    r.sort_order,
    permissions.permission_codes,
    assigned_users.assigned_user_count
  from public.roles r

  -- Lấy permission của từng role độc lập với số user được gán role đó.
  left join lateral (
    select coalesce(
      array_agg(rp.permission_code order by rp.permission_code),
      array[]::text[]
    ) as permission_codes
    from public.role_permissions rp
    where rp.role_code = r.code
  ) permissions on true

  -- Đếm user của role độc lập với danh sách permission.
  left join lateral (
    select count(*)::bigint as assigned_user_count
    from public.user_roles ur
    where ur.role_code = r.code
  ) assigned_users on true

  -- Chỉ trả role nhân viên động; không trả admin/super_admin.
  where r.is_system = false

  order by r.is_active desc, r.sort_order, r.label;
end;
$$;