-- Per-user authorization version and server-only authentication audit trail.
alter table public.profiles
  add column if not exists authz_version bigint not null default 1;

create or replace function public.bump_authz_version_from_rbac()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'user_roles' then
    update public.profiles
    set authz_version = authz_version + 1
    where id = coalesce(new.user_id, old.user_id);
  elsif tg_table_name = 'role_permissions' then
    update public.profiles as profile
    set authz_version = profile.authz_version + 1
    from public.user_roles as user_role
    where user_role.user_id = profile.id
      and user_role.role_code = coalesce(new.role_code, old.role_code);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_roles_authz_version on public.user_roles;
create trigger trg_user_roles_authz_version
  after insert or update or delete on public.user_roles
  for each row execute function public.bump_authz_version_from_rbac();

drop trigger if exists trg_role_permissions_authz_version on public.role_permissions;
create trigger trg_role_permissions_authz_version
  after insert or update or delete on public.role_permissions
  for each row execute function public.bump_authz_version_from_rbac();

create or replace function public.bump_authz_version_on_profile_status_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_active is distinct from old.is_active then
    new.authz_version := old.authz_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_authz_version_on_status on public.profiles;
create trigger trg_profiles_authz_version_on_status
  before update of is_active on public.profiles
  for each row execute function public.bump_authz_version_on_profile_status_change();

create or replace function public.current_authz_version()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select authz_version
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

revoke all on function public.current_authz_version() from public;
grant execute on function public.current_authz_version() to authenticated;

create table if not exists public.auth_security_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_security_events_created_at
  on public.auth_security_events (created_at desc);
create index if not exists idx_auth_security_events_user_id_created_at
  on public.auth_security_events (user_id, created_at desc);

alter table public.auth_security_events enable row level security;
comment on table public.auth_security_events is
  'Server-only security audit events. Browser roles have no access.';
