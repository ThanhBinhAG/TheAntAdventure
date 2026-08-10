begin;

-- Lịch sử đăng nhập tách riêng audit role/quyền vì có IP, thiết bị
-- và sẽ tăng số lượng bản ghi nhanh hơn.
create table public.auth_login_events (
  id bigint generated always as identity primary key,

  -- Null cho phiên break-glass hoặc khi user bị xóa thật sau này.
  user_id uuid references public.profiles(id) on delete set null,

  -- V1 chỉ ghi login thành công; cột này chuẩn bị cho các loại event sau.
  event_type text not null
    check (event_type in ('login_succeeded')),

  -- Không lưu username/password/token của phiên đăng nhập.
  auth_method text not null
    check (auth_method in ('password', 'break_glass')),

  -- Kiểu inet hỗ trợ IPv4 và IPv6, null khi hạ tầng không xác định được IP.
  ip_address inet,

  -- Các dữ liệu này được suy ra từ User-Agent, chỉ mang tính tham khảo.
  browser_name text not null default 'Không xác định',
  operating_system text not null default 'Không xác định',
  device_type text not null default 'unknown'
    check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),

  -- Dùng khi cần xem chi tiết, không hiển thị ở bảng lịch sử chính.
  user_agent text,

  created_at timestamptz not null default now()
);

-- Danh sách mặc định sắp theo lần đăng nhập mới nhất.
create index idx_auth_login_events_created_at
  on public.auth_login_events (created_at desc);

-- Phục vụ lọc lịch sử của một user.
create index idx_auth_login_events_user_created_at
  on public.auth_login_events (user_id, created_at desc);

-- Phục vụ truy vết một IP khi có sự cố bảo mật.
create index idx_auth_login_events_ip_address
  on public.auth_login_events (ip_address);

-- Browser không được đọc/ghi trực tiếp; API/RPC bảo mật sẽ xử lý ở bước sau.
alter table public.auth_login_events enable row level security;

commit;