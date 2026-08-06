begin;

create function public.is_current_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur
      on ur.user_id = p.id
    where p.id = auth.uid()
      and p.is_active = true
      and p.deleted_at is null
      and ur.role_code = 'super_admin'
  );
$$;

create function public.create_access_control_permission(
  input_code text,
  input_description text,
  input_group_code text,
  input_group_label text,
  input_group_sort_order integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_group_label text;
  resolved_group_label text;
begin
  if not public.is_current_super_admin() then
    raise exception 'Chỉ Super Admin được tạo chức năng mới.'
      using errcode = '42501';
  end if;

  if input_code !~ '^[a-z][a-z0-9_]{1,49}\.[a-z][a-z0-9_]{1,49}$'
    or input_code in ('*', 'users.manage') then
    raise exception 'Mã quyền không hợp lệ.'
      using errcode = '22023';
  end if;

  if length(trim(input_description)) = 0 then
    raise exception 'Tên chức năng không được để trống.'
      using errcode = '22023';
  end if;

  if input_group_code !~ '^[a-z][a-z0-9_]{1,49}$' then
    raise exception 'Mã nhóm quyền không hợp lệ.'
      using errcode = '22023';
  end if;

  select label
  into existing_group_label
  from public.permission_groups
  where code = input_group_code;

  if found then
    resolved_group_label = existing_group_label;
  else
    if length(trim(input_group_label)) = 0 then
      raise exception 'Tên nhóm quyền không được để trống.'
        using errcode = '22023';
    end if;

    resolved_group_label = trim(input_group_label);

    insert into public.permission_groups (
      code,
      label,
      sort_order
    )
    values (
      input_group_code,
      resolved_group_label,
      coalesce(
        input_group_sort_order,
        (select coalesce(max(sort_order) + 10, 10)
         from public.permission_groups)
      )
    );
  end if;

  insert into public.permissions (
    code,
    description,
    group_code
  )
  values (
    input_code,
    trim(input_description),
    input_group_code
  );

  insert into public.access_control_audit_logs (
    actor_user_id,
    action,
    after_value
  )
  values (
    auth.uid(),
    'permission_created',
    jsonb_build_object(
      'permission_code', input_code,
      'permission_description', trim(input_description),
      'group_code', input_group_code,
      'group_label', resolved_group_label
    )
  );
end;
$$;

revoke all on function public.is_current_super_admin() from public;
revoke all on function public.create_access_control_permission(
  text, text, text, text, integer
) from public;

grant execute on function public.is_current_super_admin() to authenticated;
grant execute on function public.create_access_control_permission(
  text, text, text, text, integer
) to authenticated;

commit;