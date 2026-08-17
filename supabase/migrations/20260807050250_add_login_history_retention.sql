-- Xóa lịch sử đăng nhập quá 90 ngày.
-- Chỉ dùng cho vận hành nội bộ; không cấp quyền chạy cho client.
create or replace function public.purge_old_auth_login_events(
  retention_days integer default 90
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be at least 1';
  end if;

  delete from public.auth_login_events
  where created_at < now() - make_interval(days => retention_days);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_old_auth_login_events(integer) from public;
revoke all on function public.purge_old_auth_login_events(integer) from anon;
revoke all on function public.purge_old_auth_login_events(integer) from authenticated;