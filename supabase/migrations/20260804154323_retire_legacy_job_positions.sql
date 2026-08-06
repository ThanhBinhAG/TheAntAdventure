-- ============================================================================
-- Mục đích:
-- Loại bỏ mô hình "chức vụ" cũ chưa được sử dụng.
-- Access Control hiện chỉ dùng một luồng:
-- user -> role -> permissions
-- ============================================================================

begin;

-- Chỉ lấy quyền từ role hiện tại của người dùng.
-- Không còn cộng thêm quyền từ bảng chức vụ cũ.
create or replace function public.current_permission_codes()
returns table (code text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct rp.permission_code as code
  from public.profiles p
  join public.user_roles ur
    on ur.user_id = p.id
  join public.role_permissions rp
    on rp.role_code = ur.role_code
  where p.id = auth.uid()
    and p.is_active = true
    and p.deleted_at is null;
$$;

-- Xóa các RPC của mô hình chức vụ cũ.
drop function if exists public.set_access_control_user_position(uuid, text);
drop function if exists public.replace_job_position_permissions(text, text[]);
drop function if exists public.update_access_control_job_position(
  text,
  text,
  text,
  integer,
  boolean
);
drop function if exists public.create_access_control_job_position(
  text,
  text,
  text,
  integer
);
drop function if exists public.list_access_control_job_positions();

-- Ba bảng này đã được kiểm tra là không có dữ liệu ở bước R0.1.
drop table if exists public.position_permissions;
drop table if exists public.user_positions;
drop table if exists public.job_positions;

commit;