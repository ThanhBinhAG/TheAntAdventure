create table public.crm_sessions (
  sid text primary key,
  payload_ciphertext text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_crm_sessions_active_expiry
  on public.crm_sessions (expires_at)
  where revoked_at is null;

alter table public.crm_sessions enable row level security;

comment on table public.crm_sessions is
  'Private server-owned CRM sessions. Payload is AES-GCM ciphertext; only the server service role may access it.';
