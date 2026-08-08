begin;

-- Cập nhật hàm list_access_control_permissions để loại bỏ các quyền thuộc nhóm access_control
create or replace function public.list_access_control_permissions()
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
    and p.group_code <> 'access_control'
    and g.is_navigation_feature = true
  order by g.sort_order, g.label, p.code;
end;
$$;

commit;
