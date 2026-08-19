begin;

-- Cập nhật list_auth_login_events để kiểm tra quyền users.manage thay vì super_admin
create or replace function public.list_auth_login_events(
  page_number integer default 1,
  page_size integer default 25,
  filter_user_id uuid default null,
  filter_user_query text default null,
  filter_ip_address inet default null,
  filter_device_type text default null,
  filter_from timestamptz default null,
  filter_to timestamptz default null
)
returns table (
  id bigint,
  user_id uuid,
  user_email text,
  user_display_name text,
  event_type text,
  auth_method text,
  ip_address text,
  browser_name text,
  operating_system text,
  device_type text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_page_number integer := greatest(coalesce(page_number, 1), 1);
  safe_page_size integer := least(
    greatest(coalesce(page_size, 25), 1),
    100
  );
  safe_user_query text := nullif(trim(filter_user_query), '');
begin
  -- Cho phép bất kỳ ai có quyền users.manage gọi hàm này
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền xem lịch sử đăng nhập.'
      using errcode = '42501';
  end if;

  if filter_device_type is not null
    and filter_device_type not in (
      'desktop',
      'mobile',
      'tablet',
      'unknown'
    ) then
    raise exception 'Loại thiết bị không hợp lệ.'
      using errcode = '22023';
  end if;

  if filter_from is not null
    and filter_to is not null
    and filter_from > filter_to then
    raise exception 'Khoảng thời gian không hợp lệ.'
      using errcode = '22023';
  end if;

  return query
  select
    event.id,
    event.user_id,
    profile.email as user_email,
    profile.display_name as user_display_name,
    event.event_type,
    event.auth_method,
    event.ip_address::text,
    event.browser_name,
    event.operating_system,
    event.device_type,
    event.created_at,
    count(*) over() as total_count
  from public.auth_login_events event
  left join public.profiles profile
    on profile.id = event.user_id
  where
    (filter_user_id is null or event.user_id = filter_user_id)
    and (
      safe_user_query is null
      or coalesce(profile.display_name, '') ilike
        '%' || safe_user_query || '%'
      or coalesce(profile.email, '') ilike
        '%' || safe_user_query || '%'
    )
    and (
      filter_ip_address is null
      or event.ip_address = filter_ip_address
    )
    and (
      filter_device_type is null
      or event.device_type = filter_device_type
    )
    and (
      filter_from is null
      or event.created_at >= filter_from
    )
    and (
      filter_to is null
      or event.created_at <= filter_to
    )
  order by
    event.created_at desc,
    event.id desc
  limit safe_page_size
  offset (safe_page_number - 1) * safe_page_size;
end;
$$;

commit;
