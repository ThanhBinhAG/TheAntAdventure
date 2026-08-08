begin;

-- 1. Bổ sung các cột mới vào bảng permission_groups
alter table public.permission_groups
  add column if not exists page_slug text unique;

alter table public.permission_groups
  add column if not exists is_navigation_feature boolean not null default true;

-- 2. Đánh dấu các nhóm gộp cũ không còn là navigation feature nữa
update public.permission_groups
set is_navigation_feature = false
where code in ('catalogue', 'operations', 'company');

-- 3. Chèn hoặc cập nhật 29 nhóm quyền tương ứng với 29 feature của sidebar
insert into public.permission_groups (code, label, sort_order, page_slug, is_navigation_feature)
values
  ('dashboard', 'Bảng điều hành', 10, 'dashboard', true),
  ('planner', 'Kế hoạch ngày', 15, 'planner', true),
  ('customers', 'Khách hàng', 20, 'customers', true),
  ('agents', 'Đại lý B2B', 30, 'agents', true),
  ('sales', 'Kênh bán hàng', 40, 'sales', true),
  ('tour_design', 'Thiết kế tour', 50, 'tourdesign', true),
  ('products', 'Sản phẩm tour', 60, 'products', true),
  ('gallery', 'Thư viện ảnh', 61, 'gallery', true),
  ('attractions', 'Lịch điểm tham quan', 62, 'attractions', true),
  ('pricing', 'Bảng giá tour', 70, 'pricing', true),
  ('pricing_essentials', 'Essentials', 71, 'pricing-essentials', true),
  ('pricing_accommodation', 'Lưu trú & Du thuyền', 72, 'pricing-accommodation', true),
  ('weather', 'Thời tiết', 120, 'weather', true),
  ('bookings', 'Đặt tour', 80, 'bookings', true),
  ('contracts', 'Hợp đồng', 81, 'contracts', true),
  ('suppliers', 'Nhà cung cấp', 82, 'suppliers', true),
  ('guides', 'Hướng dẫn viên', 83, 'guides', true),
  ('posttour', 'Hậu tour & Phản hồi', 84, 'posttour', true),
  ('finance', 'Tài chính', 90, 'finance', true),
  ('tax', 'Thuế', 91, 'tax', true),
  ('salary', 'Lương thưởng', 100, 'salary', true),
  ('about', 'Về chúng tôi', 110, 'about', true),
  ('culture', 'Văn hóa', 111, 'culture', true),
  ('regulations', 'Quy định', 112, 'regulations', true),
  ('hr', 'Nhân sự', 101, 'hr', true),
  ('ai', 'Yêu cầu AI', 141, 'ai', true),
  ('devnotes', 'Ghi chú kỹ thuật', 140, 'devnotes', true),
  ('teamchat', 'Chat nội bộ', 130, 'teamchat', true),
  ('access_control', 'Quản lý quyền', 150, 'access-control', true)
on conflict (code) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  page_slug = excluded.page_slug,
  is_navigation_feature = excluded.is_navigation_feature;

-- 4. Cập nhật group_code của các permission cũ đã có sẵn sang đúng nhóm mới
update public.permissions set group_code = 'dashboard' where code in ('dashboard.read');
update public.permissions set group_code = 'customers' where code in ('customers.read', 'customers.write');
update public.permissions set group_code = 'agents' where code in ('agents.read', 'agents.write');
update public.permissions set group_code = 'sales' where code in ('sales.read', 'sales.write');
update public.permissions set group_code = 'tour_design' where code in ('tour_design.read', 'tour_design.write');
update public.permissions set group_code = 'pricing' where code in ('pricing.read', 'pricing.write');
update public.permissions set group_code = 'weather' where code in ('weather.read');
update public.permissions set group_code = 'finance' where code in ('finance.read', 'finance.write');
update public.permissions set group_code = 'hr' where code in ('hr.read', 'hr.write');
update public.permissions set group_code = 'devnotes' where code in ('devnotes.read', 'devnotes.write');
update public.permissions set group_code = 'teamchat' where code in ('teamchat.read', 'teamchat.write');
update public.permissions set group_code = 'access_control' where code in ('users.manage');

-- 5. Tạo mới các quyền read/write cho các feature còn thiếu
insert into public.permissions (code, description, group_code)
values
  ('dashboard.write', 'Sửa bảng điều hành', 'dashboard'),
  ('planner.read', 'Xem kế hoạch ngày', 'planner'),
  ('planner.write', 'Sửa kế hoạch ngày', 'planner'),
  ('products.read', 'Xem sản phẩm tour', 'products'),
  ('products.write', 'Sửa sản phẩm tour', 'products'),
  ('gallery.read', 'Xem thư viện ảnh', 'gallery'),
  ('gallery.write', 'Sửa thư viện ảnh', 'gallery'),
  ('attractions.read', 'Xem lịch điểm tham quan', 'attractions'),
  ('attractions.write', 'Sửa lịch điểm tham quan', 'attractions'),
  ('pricing_essentials.read', 'Xem Essentials', 'pricing_essentials'),
  ('pricing_essentials.write', 'Sửa Essentials', 'pricing_essentials'),
  ('pricing_accommodation.read', 'Xem lưu trú & du thuyền', 'pricing_accommodation'),
  ('pricing_accommodation.write', 'Sửa lưu trú & du thuyền', 'pricing_accommodation'),
  ('weather.write', 'Cập nhật thời tiết', 'weather'),
  ('bookings.read', 'Xem đặt tour', 'bookings'),
  ('bookings.write', 'Sửa đặt tour', 'bookings'),
  ('contracts.read', 'Xem hợp đồng', 'contracts'),
  ('contracts.write', 'Sửa hợp đồng', 'contracts'),
  ('suppliers.read', 'Xem nhà cung cấp', 'suppliers'),
  ('suppliers.write', 'Sửa nhà cung cấp', 'suppliers'),
  ('guides.read', 'Xem hướng dẫn viên', 'guides'),
  ('guides.write', 'Sửa hướng dẫn viên', 'guides'),
  ('posttour.read', 'Xem hậu tour & phản hồi', 'posttour'),
  ('posttour.write', 'Sửa hậu tour & phản hồi', 'posttour'),
  ('tax.read', 'Xem thuế', 'tax'),
  ('tax.write', 'Sửa thuế', 'tax'),
  ('salary.read', 'Xem lương thưởng', 'salary'),
  ('salary.write', 'Sửa lương thưởng', 'salary'),
  ('about.read', 'Xem về chúng tôi', 'about'),
  ('about.write', 'Sửa về chúng tôi', 'about'),
  ('culture.read', 'Xem văn hóa công ty', 'culture'),
  ('culture.write', 'Sửa văn hóa công ty', 'culture'),
  ('regulations.read', 'Xem quy định công ty', 'regulations'),
  ('regulations.write', 'Sửa quy định công ty', 'regulations'),
  ('ai.read', 'Xem yêu cầu AI', 'ai'),
  ('ai.write', 'Sửa yêu cầu AI', 'ai'),
  ('access_control.read', 'Xem phân quyền hệ thống', 'access_control'),
  ('access_control.write', 'Sửa phân quyền hệ thống', 'access_control')
on conflict (code) do update
set
  description = excluded.description,
  group_code = excluded.group_code;

-- 6. Tự động ánh xạ quyền từ nhóm gộp cũ sang các quyền mới tương ứng cho các role
do $$
declare
  r record;
begin
  -- catalogue.read -> products.read, gallery.read, attractions.read
  for r in select role_code from public.role_permissions where permission_code = 'catalogue.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'products.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'gallery.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'attractions.read') on conflict do nothing;
  end loop;

  -- catalogue.write -> products.write, gallery.write, attractions.write
  for r in select role_code from public.role_permissions where permission_code = 'catalogue.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'products.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'gallery.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'attractions.write') on conflict do nothing;
  end loop;

  -- operations.read -> bookings.read, contracts.read, suppliers.read, guides.read, posttour.read
  for r in select role_code from public.role_permissions where permission_code = 'operations.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'bookings.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'contracts.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'suppliers.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'guides.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'posttour.read') on conflict do nothing;
  end loop;

  -- operations.write -> bookings.write, contracts.write, suppliers.write, guides.write, posttour.write
  for r in select role_code from public.role_permissions where permission_code = 'operations.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'bookings.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'contracts.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'suppliers.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'guides.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'posttour.write') on conflict do nothing;
  end loop;

  -- company.read -> about.read, culture.read, regulations.read
  for r in select role_code from public.role_permissions where permission_code = 'company.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'about.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'culture.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'regulations.read') on conflict do nothing;
  end loop;

  -- sales.read -> planner.read
  for r in select role_code from public.role_permissions where permission_code = 'sales.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'planner.read') on conflict do nothing;
  end loop;

  -- sales.write -> planner.write
  for r in select role_code from public.role_permissions where permission_code = 'sales.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'planner.write') on conflict do nothing;
  end loop;

  -- pricing.read -> pricing_essentials.read, pricing_accommodation.read
  for r in select role_code from public.role_permissions where permission_code = 'pricing.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'pricing_essentials.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'pricing_accommodation.read') on conflict do nothing;
  end loop;

  -- pricing.write -> pricing_essentials.write, pricing_accommodation.write
  for r in select role_code from public.role_permissions where permission_code = 'pricing.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'pricing_essentials.write') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'pricing_accommodation.write') on conflict do nothing;
  end loop;

  -- finance.read -> tax.read
  for r in select role_code from public.role_permissions where permission_code = 'finance.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'tax.read') on conflict do nothing;
  end loop;

  -- finance.write -> tax.write
  for r in select role_code from public.role_permissions where permission_code = 'finance.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'tax.write') on conflict do nothing;
  end loop;

  -- hr.read -> salary.read
  for r in select role_code from public.role_permissions where permission_code = 'hr.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'salary.read') on conflict do nothing;
  end loop;

  -- hr.write -> salary.write
  for r in select role_code from public.role_permissions where permission_code = 'hr.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'salary.write') on conflict do nothing;
  end loop;

  -- devnotes.read -> ai.read
  for r in select role_code from public.role_permissions where permission_code = 'devnotes.read' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'ai.read') on conflict do nothing;
  end loop;

  -- devnotes.write -> ai.write
  for r in select role_code from public.role_permissions where permission_code = 'devnotes.write' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'ai.write') on conflict do nothing;
  end loop;

  -- users.manage -> access_control.read, access_control.write
  for r in select role_code from public.role_permissions where permission_code = 'users.manage' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'access_control.read') on conflict do nothing;
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'access_control.write') on conflict do nothing;
  end loop;

  -- weather.refresh -> weather.write
  for r in select role_code from public.role_permissions where permission_code = 'weather.refresh' loop
    insert into public.role_permissions (role_code, permission_code) values (r.role_code, 'weather.write') on conflict do nothing;
  end loop;
end;
$$;

-- 7. Cập nhật hàm list_access_control_permissions để lọc các nhóm quyền của feature trên sidebar
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
    and g.is_navigation_feature = true
  order by g.sort_order, g.label, p.code;
end;
$$;

commit;
