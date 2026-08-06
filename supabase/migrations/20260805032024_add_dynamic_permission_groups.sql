begin;

create table public.permission_groups (
  code text primary key
    check (code ~ '^[a-z][a-z0-9_]{1,49}$'),
  label text not null
    check (length(trim(label)) > 0),
  sort_order integer not null default 0
    check (sort_order >= 0),
  created_at timestamptz not null default now()
);

alter table public.permission_groups enable row level security;

alter table public.permissions
  add column if not exists group_code text
  references public.permission_groups(code);

insert into public.permission_groups (code, label, sort_order)
values
  ('dashboard', 'Bảng điều hành', 10),
  ('customers', 'Khách hàng', 20),
  ('agents', 'Đại lý B2B', 30),
  ('sales', 'Bán hàng', 40),
  ('tour_design', 'Thiết kế tour', 50),
  ('catalogue', 'Sản phẩm và thư viện ảnh', 60),
  ('pricing', 'Bảng giá', 70),
  ('operations', 'Vận hành', 80),
  ('finance', 'Tài chính', 90),
  ('hr', 'Nhân sự', 100),
  ('company', 'Thông tin công ty', 110),
  ('weather', 'Thời tiết', 120),
  ('teamchat', 'Chat nội bộ', 130),
  ('devnotes', 'Ghi chú kỹ thuật', 140)
on conflict (code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order;

update public.permissions
set group_code = split_part(code, '.', 1)
where code like '%.%'
  and code not in ('*', 'users.manage')
  and group_code is null;

create index if not exists idx_permissions_group_code
  on public.permissions(group_code);

commit;