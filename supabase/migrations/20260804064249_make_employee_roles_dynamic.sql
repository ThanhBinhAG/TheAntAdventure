-- Biến bảng roles thành danh mục role động theo công việc.
--
-- Không tạo role Sales/Kế toán mẫu.
-- Admin sẽ tự tạo role nhân viên bằng giao diện ở các bước sau.

begin;

-- ============================================================================
-- 1. Metadata để phân biệt role hệ thống và role nhân viên động.
-- ============================================================================

alter table public.roles
add column if not exists is_system boolean not null default false;

alter table public.roles
add column if not exists is_active boolean not null default true;

alter table public.roles
add column if not exists sort_order integer not null default 0;

comment on column public.roles.is_system is
  'true: role hệ thống cố định, không quản lý bằng UI role nhân viên.';

comment on column public.roles.is_active is
  'false: không gán mới role này, nhưng vẫn giữ dữ liệu và lịch sử cũ.';

comment on column public.roles.sort_order is
  'Thứ tự hiển thị của role trên Access Control.';

-- ============================================================================
-- 2. Đánh dấu các role hệ thống.
-- ============================================================================
-- employee là role chuyển tiếp của dữ liệu cũ.
-- Không hiển thị nó trong màn hình tạo/cấu hình role mới.
-- Các nhân viên hiện tại vẫn giữ nguyên role này cho đến khi được gán role mới.

update public.roles
set
  is_system = code in ('admin', 'super_admin', 'employee'),
  is_active = true,
  sort_order = case code
    when 'admin' then 1
    when 'super_admin' then 2
    when 'employee' then 999
    else sort_order
  end
where code in ('admin', 'super_admin', 'employee');

-- ============================================================================
-- 3. Index phục vụ truy vấn danh sách role đang hoạt động trên giao diện.
-- ============================================================================

create index if not exists idx_roles_active_sort_order
  on public.roles (is_active, sort_order, label);

-- ============================================================================
-- 4. Lấy danh sách role nhân viên động.
-- ============================================================================
-- Không trả admin, super_admin và employee cũ chuyển tiếp.

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
    coalesce(
      array_agg(rp.permission_code order by rp.permission_code)
        filter (where rp.permission_code is not null),
      array[]::text[]
    ),
    count(distinct ur.user_id)
  from public.roles r
  left join public.role_permissions rp
    on rp.role_code = r.code
  left join public.user_roles ur
    on ur.role_code = r.code
  where r.is_system = false
  group by
    r.code,
    r.label,
    r.description,
    r.is_active,
    r.sort_order
  order by r.is_active desc, r.sort_order, r.label;
end;
$$;

-- ============================================================================
-- 5. Tạo role nhân viên động.
-- ============================================================================

create or replace function public.create_access_control_staff_role(
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
    raise exception 'Bạn không có quyền tạo role nhân viên.'
      using errcode = '42501';
  end if;

  if input_code !~ '^[a-z0-9_]{2,50}$' then
    raise exception 'Mã role không hợp lệ.'
      using errcode = '22023';
  end if;

  if length(trim(input_label)) = 0 then
    raise exception 'Tên role không được để trống.'
      using errcode = '22023';
  end if;

  insert into public.roles (
    code,
    label,
    description,
    is_system,
    is_active,
    sort_order
  )
  values (
    input_code,
    trim(input_label),
    nullif(trim(input_description), ''),
    false,
    true,
    coalesce(input_sort_order, 0)
  );

  insert into public.access_control_audit_logs (
    actor_user_id,
    action,
    after_value
  )
  values (
    auth.uid(),
    'staff_role_created',
    jsonb_build_object(
      'role_code', input_code,
      'label', trim(input_label)
    )
  );
end;
$$;

-- ============================================================================
-- 6. Sửa hoặc vô hiệu hóa role nhân viên.
-- ============================================================================

create or replace function public.update_access_control_staff_role(
  target_role_code text,
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
    raise exception 'Bạn không có quyền cập nhật role nhân viên.'
      using errcode = '42501';
  end if;

  if length(trim(new_label)) = 0 then
    raise exception 'Tên role không được để trống.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.roles
    where code = target_role_code
      and is_system = false
  ) then
    raise exception 'Không tìm thấy role nhân viên.'
      using errcode = '22023';
  end if;

  if new_is_active = false
    and exists (
      select 1
      from public.user_roles
      where role_code = target_role_code
    ) then
    raise exception 'Hãy chuyển toàn bộ nhân viên sang role khác trước.'
      using errcode = '22023';
  end if;

  update public.roles
  set
    label = trim(new_label),
    description = nullif(trim(new_description), ''),
    sort_order = coalesce(new_sort_order, 0),
    is_active = new_is_active
  where code = target_role_code;

  insert into public.access_control_audit_logs (
    actor_user_id,
    action,
    after_value
  )
  values (
    auth.uid(),
    'staff_role_updated',
    jsonb_build_object(
      'role_code', target_role_code,
      'label', trim(new_label),
      'is_active', new_is_active
    )
  );
end;
$$;

-- ============================================================================
-- 7. Lưu permission của role nhân viên động.
-- ============================================================================

create or replace function public.replace_access_control_staff_role_permissions(
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
    raise exception 'Bạn không có quyền cập nhật permission role.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.roles
    where code = target_role_code
      and is_system = false
  ) then
    raise exception 'Chỉ được chỉnh role nhân viên động.'
      using errcode = '22023';
  end if;

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

  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into old_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  delete from public.role_permissions
  where role_code = target_role_code;

  insert into public.role_permissions (
    role_code,
    permission_code
  )
  select
    target_role_code,
    distinct_permission_code
  from (
    select distinct permission_code as distinct_permission_code
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
    'staff_role_permissions_replaced',
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
-- 8. Gán role cho user.
-- ============================================================================
-- Có thể gán:
-- - admin: role hệ thống toàn quyền.
-- - employee: role cũ chuyển tiếp, chỉ dùng trong lúc migrate dữ liệu.
-- - role nhân viên động đang hoạt động.
--
-- Không thể gán/chỉnh super_admin qua Access Control.

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

  -- Không cho người quản trị tự đổi role của chính mình.
  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự đổi role của chính mình.'
      using errcode = '42501';
  end if;

  select role_code
  into current_role_code
  from public.user_roles
  where user_id = target_user_id;

  -- Super Admin là tài khoản Dev ẩn, không thao tác từ Access Control.
  if current_role_code = 'super_admin' then
    raise exception 'Không thể thay đổi tài khoản Super Admin tại đây.'
      using errcode = '42501';
  end if;

  -- Chỉ cho phép Admin, Employee chuyển tiếp hoặc role nhân viên động.
  if new_role_code <> 'admin'
    and new_role_code <> 'employee'
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

  delete from public.user_roles
  where user_id = target_user_id;

  insert into public.user_roles (
    user_id,
    role_code
  )
  values (
    target_user_id,
    new_role_code
  );

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

commit;
