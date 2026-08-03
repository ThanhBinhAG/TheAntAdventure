-- RPC ghi dữ liệu cho chức năng quản lý tài khoản Access Control.
--
-- Chức năng:
-- - Sửa tên hiển thị user.
-- - Kích hoạt hoặc vô hiệu hóa user.
-- - Xóa mềm và khôi phục user.
-- - Không cho thao tác với Super Admin cuối cùng.
-- - Không cho Super Admin tự vô hiệu hóa hoặc tự xóa.
-- - Ghi lịch sử audit cho mọi thay đổi.
--
-- Lưu ý:
-- - Không xóa auth.users.
-- - Không sửa email ở V1 vì email là định danh Supabase Auth.

-- ============================================================================
-- 1. Sửa thông tin hiển thị của user.
-- ============================================================================

create function public.update_access_control_user_profile(
  target_user_id uuid,
  new_display_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_display_name text;
  normalized_display_name text := nullif(
    trim(new_display_name),
    ''
  );
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền sửa thông tin người dùng.'
      using errcode = '42501';
  end if;

  if normalized_display_name is null
    or char_length(normalized_display_name) > 100 then
    raise exception 'Tên hiển thị phải có từ 1 đến 100 ký tự.'
      using errcode = '22023';
  end if;

  select display_name
  into old_display_name
  from public.profiles
  where id = target_user_id
    and deleted_at is null;

  if not found then
    raise exception 'Không tìm thấy người dùng.'
      using errcode = '22023';
  end if;

  -- Không tạo audit log nếu tên không thay đổi.
  if old_display_name is not distinct from normalized_display_name then
    return;
  end if;

  update public.profiles
  set display_name = normalized_display_name
  where id = target_user_id;

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
    'user_profile_updated',
    jsonb_build_object(
      'display_name',
      old_display_name
    ),
    jsonb_build_object(
      'display_name',
      normalized_display_name
    )
  );
end;
$$;

-- ============================================================================
-- 2. Kích hoạt hoặc vô hiệu hóa user.
-- ============================================================================

create function public.set_access_control_user_active(
  target_user_id uuid,
  new_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_is_active boolean;
  current_role_code text;
  active_super_admin_count integer;
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền thay đổi trạng thái người dùng.'
      using errcode = '42501';
  end if;

  select
    p.is_active,
    ur.role_code
  into
    old_is_active,
    current_role_code
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  where p.id = target_user_id
    and p.deleted_at is null;

  if not found then
    raise exception 'Không tìm thấy người dùng.'
      using errcode = '22023';
  end if;

  -- Không cho tự vô hiệu hóa tài khoản đang đăng nhập.
  if target_user_id = auth.uid()
    and new_is_active = false then
    raise exception 'Bạn không thể tự vô hiệu hóa tài khoản.'
      using errcode = '42501';
  end if;

  -- Không cho vô hiệu hóa Super Admin đang hoạt động cuối cùng.
  if current_role_code = 'super_admin'
    and old_is_active = true
    and new_is_active = false then

    select count(*)
    into active_super_admin_count
    from public.user_roles ur
    join public.profiles p
      on p.id = ur.user_id
    where ur.role_code = 'super_admin'
      and p.is_active = true
      and p.deleted_at is null;

    if active_super_admin_count <= 1 then
      raise exception 'Không thể vô hiệu hóa Super Admin cuối cùng.'
        using errcode = '42501';
    end if;
  end if;

  if old_is_active = new_is_active then
    return;
  end if;

  update public.profiles
  set is_active = new_is_active
  where id = target_user_id;

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
    case
      when new_is_active then 'user_activated'
      else 'user_deactivated'
    end,
    jsonb_build_object(
      'is_active',
      old_is_active,
      'role_code',
      current_role_code
    ),
    jsonb_build_object(
      'is_active',
      new_is_active,
      'role_code',
      current_role_code
    )
  );
end;
$$;

-- ============================================================================
-- 3. Xóa mềm user.
-- ============================================================================

create function public.soft_delete_access_control_user(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role_code text;
  remaining_super_admin_count integer;
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xóa người dùng.'
      using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Bạn không thể tự xóa tài khoản của chính mình.'
      using errcode = '42501';
  end if;

  select ur.role_code
  into current_role_code
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  where p.id = target_user_id
    and p.deleted_at is null;

  if not found then
    raise exception 'Không tìm thấy người dùng hoặc user đã bị xóa.'
      using errcode = '22023';
  end if;

  -- Phải luôn còn ít nhất một Super Admin chưa bị xóa.
  if current_role_code = 'super_admin' then
    select count(*)
    into remaining_super_admin_count
    from public.user_roles ur
    join public.profiles p
      on p.id = ur.user_id
    where ur.role_code = 'super_admin'
      and p.deleted_at is null;

    if remaining_super_admin_count <= 1 then
      raise exception 'Không thể xóa Super Admin cuối cùng.'
        using errcode = '42501';
    end if;
  end if;

  update public.profiles
  set
    is_active = false,
    deleted_at = now()
  where id = target_user_id;

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
    'user_soft_deleted',
    jsonb_build_object(
      'is_active',
      true,
      'role_code',
      current_role_code
    ),
    jsonb_build_object(
      'is_active',
      false,
      'role_code',
      current_role_code
    )
  );
end;
$$;

-- ============================================================================
-- 4. Khôi phục user đã xóa mềm.
-- ============================================================================

create function public.restore_access_control_user(
  target_user_id uuid
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
    raise exception 'Bạn không có quyền khôi phục người dùng.'
      using errcode = '42501';
  end if;

  select ur.role_code
  into current_role_code
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  where p.id = target_user_id
    and p.deleted_at is not null;

  if not found then
    raise exception 'Không tìm thấy user đã xóa để khôi phục.'
      using errcode = '22023';
  end if;

  update public.profiles
  set
    is_active = true,
    deleted_at = null
  where id = target_user_id;

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
    'user_restored',
    jsonb_build_object(
      'is_active',
      false,
      'role_code',
      current_role_code
    ),
    jsonb_build_object(
      'is_active',
      true,
      'role_code',
      current_role_code
    )
  );
end;
$$;

-- ============================================================================
-- 5. Chỉ user đã đăng nhập mới gọi RPC.
-- Database vẫn kiểm tra users.manage ở bên trong từng hàm.
-- ============================================================================

revoke all on function public.update_access_control_user_profile(
  uuid,
  text
) from public;

revoke all on function public.set_access_control_user_active(
  uuid,
  boolean
) from public;

revoke all on function public.soft_delete_access_control_user(
  uuid
) from public;

revoke all on function public.restore_access_control_user(
  uuid
) from public;

grant execute on function public.update_access_control_user_profile(
  uuid,
  text
) to authenticated;

grant execute on function public.set_access_control_user_active(
  uuid,
  boolean
) to authenticated;

grant execute on function public.soft_delete_access_control_user(
  uuid
) to authenticated;

grant execute on function public.restore_access_control_user(
  uuid
) to authenticated;