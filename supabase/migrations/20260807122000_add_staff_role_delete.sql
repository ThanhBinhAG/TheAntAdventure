-- Xóa role nhân viên động sau khi đã chuyển hết nhân viên sang role khác.
-- Không dùng cascade cho user_roles: xóa role không được làm user mất role âm thầm.

begin;

-- FK cũ dùng ON DELETE CASCADE. Đổi sang RESTRICT để cả thao tác SQL trực tiếp
-- cũng không thể xóa role đang có người dùng gán vào.
alter table public.user_roles
  drop constraint if exists user_roles_role_code_fkey,
  add constraint user_roles_role_code_fkey
    foreign key (role_code)
    references public.roles(code)
    on delete restrict;

create or replace function public.delete_access_control_staff_role(
  target_role_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_role public.roles%rowtype;
  deleted_permission_codes text[];
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xóa role nhân viên.'
      using errcode = '42501';
  end if;

  -- Khóa role trong lúc kiểm tra/xóa để hai quản trị viên không thể xóa cùng lúc.
  select *
  into deleted_role
  from public.roles
  where code = target_role_code
    and is_system = false
  for update;

  if not found then
    raise exception 'Không tìm thấy role nhân viên hoặc role là role hệ thống.'
      using errcode = '22023';
  end if;

  -- Không tự động bỏ role của nhân viên. Người quản trị phải gán role thay thế
  -- trước, nhờ đó quyền hiệu lực của nhân viên không thay đổi bất ngờ.
  if exists (
    select 1
    from public.user_roles
    where role_code = target_role_code
  ) then
    raise exception 'Hãy chuyển toàn bộ nhân viên sang role khác trước.'
      using errcode = '23503';
  end if;

  select coalesce(
    array_agg(permission_code order by permission_code),
    array[]::text[]
  )
  into deleted_permission_codes
  from public.role_permissions
  where role_code = target_role_code;

  -- Ghi audit trước khi role bị xóa. JSON giữ đủ thông tin để lịch sử vẫn đọc
  -- được dù bảng roles và role_permissions không còn bản ghi tương ứng.
  insert into public.access_control_audit_logs (
    actor_user_id,
    action,
    before_value
  )
  values (
    auth.uid(),
    'staff_role_deleted',
    jsonb_build_object(
      'role_code', deleted_role.code,
      'label', deleted_role.label,
      'description', deleted_role.description,
      'permission_codes', deleted_permission_codes
    )
  );

  -- role_permissions dùng ON DELETE CASCADE nên chỉ permission của role này
  -- được dọn cùng role; user_roles đã được bảo vệ bằng ON DELETE RESTRICT.
  delete from public.roles
  where code = deleted_role.code;
end;
$$;

-- Chỉ request đã đăng nhập mới gọi được RPC; bên trong vẫn kiểm tra users.manage.
revoke all on function public.delete_access_control_staff_role(text) from public;
grant execute on function public.delete_access_control_staff_role(text)
  to authenticated;

commit;
