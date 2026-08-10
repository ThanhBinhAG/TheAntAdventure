begin;

drop function if exists public.list_access_control_permissions();

create function public.list_access_control_permissions()
returns table (
  permission_code text,
  permission_description text,
  group_code text,
  group_label text,
  group_sort_order integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('users.manage') then
    raise exception 'Bạn không có quyền quản lý phân quyền.'
      using errcode = '42501';
  end if;

  return query
  select
    p.code,
    p.description,
    p.group_code,
    g.label,
    g.sort_order
  from public.permissions p
  join public.permission_groups g
    on g.code = p.group_code
  where p.code not in ('*', 'users.manage')
  order by g.sort_order, g.label, p.code;
end;
$$;

revoke all on function public.list_access_control_permissions() from public;
grant execute on function public.list_access_control_permissions() to authenticated;

commit;