-- Phase 2: migrate the retired encrypted-payload table to opaque-token CRM
-- sessions. Existing legacy rows are revoked; they never become valid under the
-- new contract and users must sign in again after this migration.
alter table public.crm_sessions
  alter column payload_ciphertext drop not null,
  add column if not exists token_hash text,
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists access_token_ciphertext text,
  add column if not exists refresh_token_ciphertext text,
  add column if not exists access_token_expires_at timestamptz,
  add column if not exists refresh_token_key_version integer not null default 1,
  add column if not exists last_used_at timestamptz;

update public.crm_sessions
set revoked_at = coalesce(revoked_at, now()),
    updated_at = now()
where token_hash is null;

create unique index if not exists idx_crm_sessions_token_hash
  on public.crm_sessions (token_hash)
  where token_hash is not null;

create index if not exists idx_crm_sessions_user_active
  on public.crm_sessions (user_id, expires_at)
  where revoked_at is null;

alter table public.crm_sessions
  add constraint crm_sessions_active_rows_have_credentials
  check (
    revoked_at is not null
    or (
      token_hash is not null
      and user_id is not null
      and access_token_ciphertext is not null
      and refresh_token_ciphertext is not null
      and access_token_expires_at is not null
    )
  ) not valid;

create or replace function public.rotate_crm_session_credentials(
  p_sid text,
  p_token_hash text,
  p_access_token_ciphertext text,
  p_refresh_token_ciphertext text,
  p_access_token_expires_at timestamptz,
  p_expires_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.crm_sessions
  set access_token_ciphertext = p_access_token_ciphertext,
      refresh_token_ciphertext = p_refresh_token_ciphertext,
      access_token_expires_at = p_access_token_expires_at,
      expires_at = p_expires_at,
      last_used_at = now(),
      updated_at = now()
  where sid = p_sid
    and token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now();

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.rotate_crm_session_credentials(text, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.rotate_crm_session_credentials(text, text, text, text, timestamptz, timestamptz)
  to service_role;

create or replace function public.cleanup_crm_sessions(p_retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.crm_sessions
  where expires_at < now() - make_interval(days => p_retention_days)
     or (revoked_at is not null and revoked_at < now() - make_interval(days => p_retention_days));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_crm_sessions(integer) from public, anon, authenticated;
grant execute on function public.cleanup_crm_sessions(integer) to service_role;

comment on table public.crm_sessions is
  'Server-owned durable CRM sessions. Browser receives only an opaque token; Supabase credentials are AES-GCM ciphertext readable only by server service-role.';
