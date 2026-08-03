-- Bổ sung RPC đọc lịch sử thay đổi phân quyền.
--
-- Mục tiêu:
-- - Super Admin xem được các lần đổi role và permission.
-- - Không cho client đọc trực tiếp bảng audit log.
-- - Có phân trang để log tăng nhiều vẫn tải nhanh.

create function public.list_access_control_audit_logs(
  page_number integer default 1,
  page_size integer default 20
)
returns table (
  id bigint,
  action text,
  actor_email text,
  actor_display_name text,
  target_email text,
  target_display_name text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- Giới hạn phân trang để tránh request quá lớn.
  safe_page_number integer := greatest(coalesce(page_number, 1), 1);
  safe_page_size integer := least(
    greatest(coalesce(page_size, 20), 1),
    100
  );
begin
  -- Chỉ Super Admin có users.manage mới xem được log.
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem lịch sử phân quyền.'
      using errcode = '42501';
  end if;

  return query
  select
    audit_log.id,
    audit_log.action,

    -- Thông tin người thực hiện thay đổi.
    actor.email as actor_email,
    actor.display_name as actor_display_name,

    -- Thông tin user bị đổi role.
    -- Sẽ null nếu log là thay đổi permission của role.
    target.email as target_email,
    target.display_name as target_display_name,

    audit_log.before_value,
    audit_log.after_value,
    audit_log.created_at,

    -- Tổng số log trước khi phân trang.
    count(*) over() as total_count
  from public.access_control_audit_logs audit_log
  left join public.profiles actor
    on actor.id = audit_log.actor_user_id
  left join public.profiles target
    on target.id = audit_log.target_user_id
  order by
    audit_log.created_at desc,
    audit_log.id desc
  limit safe_page_size
  offset (safe_page_number - 1) * safe_page_size;
end;
$$;

-- Không cho anonymous hoặc public gọi hàm.
revoke all on function public.list_access_control_audit_logs(
  integer,
  integer
) from public;

-- Chỉ user đã đăng nhập mới có thể gọi.
-- Bên trong hàm vẫn kiểm tra users.manage thêm lần nữa.
grant execute on function public.list_access_control_audit_logs(
  integer,
  integer
) to authenticated;