-- RBAC foundation. Business-table RLS remains unchanged in this migration.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  code text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

create table public.role_permissions (
  role_code text not null references public.roles(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role_code, permission_code)
);

create index idx_user_roles_user_id on public.user_roles(user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Tạo profile cho các user Auth đã tồn tại.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;

create policy profiles_select_own
  on public.profiles
  for select to authenticated
  using (id = auth.uid());

create or replace function public.current_permission_codes()
returns table (code text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct rp.permission_code
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  join public.role_permissions rp on rp.role_code = ur.role_code
  where ur.user_id = auth.uid()
    and p.is_active = true;
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.current_permission_codes()
    where code in ('*', required_permission)
  );
$$;

revoke all on function public.current_permission_codes() from public;
revoke all on function public.has_permission(text) from public;
grant execute on function public.current_permission_codes() to authenticated;
grant execute on function public.has_permission(text) to authenticated;

insert into public.roles (code, label, description) values
  ('super_admin', 'Super admin', 'Toàn quyền hệ thống'),
  ('admin', 'Admin', 'Quản trị nghiệp vụ'),
  ('sales_manager', 'Sales manager', 'Quản lý bán hàng'),
  ('sales_agent', 'Sales agent', 'Nhân viên bán hàng'),
  ('operations', 'Operations', 'Điều hành tour'),
  ('finance', 'Finance', 'Tài chính và giá'),
  ('hr', 'HR', 'Nhân sự và lương'),
  ('content_editor', 'Content editor', 'Sản phẩm, ảnh, điểm đến'),
  ('viewer', 'Viewer', 'Chỉ xem');

insert into public.permissions (code, description) values
  ('*', 'Toàn quyền'),
  ('dashboard.read', 'Xem dashboard'),
  ('customers.read', 'Xem khách hàng'),
  ('customers.write', 'Sửa khách hàng'),
  ('agents.read', 'Xem đại lý'),
  ('agents.write', 'Sửa đại lý'),
  ('sales.read', 'Xem sales'),
  ('sales.write', 'Sửa sales'),
  ('tour_design.read', 'Xem thiết kế tour'),
  ('tour_design.write', 'Sửa thiết kế tour'),
  ('tour_design.export', 'Xuất proposal'),
  ('catalogue.read', 'Xem sản phẩm, ảnh, điểm đến'),
  ('catalogue.write', 'Sửa sản phẩm, ảnh, điểm đến'),
  ('pricing.read', 'Xem bảng giá'),
  ('pricing.write', 'Sửa bảng giá'),
  ('pricing.export', 'Xuất bảng giá'),
  ('operations.read', 'Xem vận hành'),
  ('operations.write', 'Sửa vận hành'),
  ('finance.read', 'Xem tài chính'),
  ('finance.write', 'Sửa tài chính'),
  ('hr.read', 'Xem nhân sự'),
  ('hr.write', 'Sửa nhân sự'),
  ('company.read', 'Xem cổng thông tin công ty'),
  ('devnotes.read', 'Xem ghi chú kỹ thuật'),
  ('devnotes.write', 'Sửa ghi chú kỹ thuật'),
  ('teamchat.read', 'Xem chat nội bộ'),
  ('teamchat.write', 'Gửi chat nội bộ'),
  ('weather.read', 'Xem thời tiết'),
  ('weather.refresh', 'Làm mới thời tiết'),
  ('users.manage', 'Quản lý role người dùng');

insert into public.role_permissions (role_code, permission_code)
values ('super_admin', '*');

insert into public.role_permissions (role_code, permission_code)
select 'admin', code
from public.permissions
where code <> '*';

insert into public.role_permissions (role_code, permission_code)
select 'sales_manager', code
from public.permissions
where code in (
  'dashboard.read', 'customers.read', 'customers.write',
  'agents.read', 'agents.write', 'sales.read', 'sales.write',
  'tour_design.read', 'tour_design.write', 'tour_design.export',
  'catalogue.read', 'pricing.read', 'pricing.export',
  'weather.read', 'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'sales_agent', code
from public.permissions
where code in (
  'dashboard.read', 'customers.read', 'customers.write',
  'sales.read', 'sales.write', 'tour_design.read',
  'tour_design.write', 'catalogue.read', 'pricing.read',
  'weather.read', 'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'operations', code
from public.permissions
where code in (
  'dashboard.read', 'customers.read', 'sales.read',
  'tour_design.read', 'catalogue.read',
  'operations.read', 'operations.write',
  'weather.read', 'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'finance', code
from public.permissions
where code in (
  'dashboard.read', 'operations.read',
  'finance.read', 'finance.write',
  'pricing.read', 'pricing.write', 'pricing.export',
  'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'hr', code
from public.permissions
where code in (
  'dashboard.read', 'hr.read', 'hr.write',
  'company.read', 'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'content_editor', code
from public.permissions
where code in (
  'dashboard.read', 'catalogue.read', 'catalogue.write',
  'pricing.read', 'weather.read', 'teamchat.read', 'teamchat.write'
);

insert into public.role_permissions (role_code, permission_code)
select 'viewer', code
from public.permissions
where code in (
  'dashboard.read', 'company.read', 'weather.read', 'teamchat.read'
);