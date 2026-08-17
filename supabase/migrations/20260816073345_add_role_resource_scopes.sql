-- RLS scope foundation for the current CRM phase.
-- This migration does not change business-table policies yet.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.role_resource_scopes (
  role_code text not null references public.roles(code) on delete cascade,
  resource_code text not null check (resource_code in (
    'customers', 'leads', 'tour_drafts', 'bookings', 'tasks', 'comms'
  )),
  action text not null check (action in ('read', 'write', 'delete')),
  scope text not null check (scope in ('own', 'assigned', 'all')),
  created_at timestamptz not null default now(),
  primary key (role_code, resource_code, action)
);

revoke all on table public.role_resource_scopes from anon, authenticated;

comment on table public.role_resource_scopes is
  'Phạm vi truy cập dữ liệu theo role. Chỉ Access Control RPC được phép quản lý.';

alter table public.role_resource_scopes enable row level security;

create or replace function private.has_resource_scope(
  requested_resource text,
  requested_action text,
  accepted_scopes text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.has_permission('*')
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.user_id
      join public.role_resource_scopes rrs on rrs.role_code = ur.role_code
      where ur.user_id = (select auth.uid())
        and p.is_active = true
        and p.deleted_at is null
        and rrs.resource_code = requested_resource
        and rrs.action = requested_action
        and rrs.scope = any(accepted_scopes)
    );
$$;

revoke all on function private.has_resource_scope(text, text, text[]) from public;
grant execute on function private.has_resource_scope(text, text, text[]) to authenticated;

commit;
