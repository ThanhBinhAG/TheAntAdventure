-- Khung dữ liệu chức vụ động cho Access Control.
--
-- Không seed chức vụ: Admin sẽ tự thêm từ giao diện sau này.
-- Một Employee có thể chưa được phân công chức vụ.
-- V1: mỗi Employee chỉ có một chức vụ chính.

begin;

-- ============================================================================
-- 1. Danh sách chức vụ do Admin quản lý từ giao diện.
-- ============================================================================

create table public.job_positions (
  -- Mã kỹ thuật ổn định, ví dụ: sales, tour_operator.
  code text primary key,

  -- Tên hiển thị có thể đổi từ giao diện, ví dụ: Nhân viên Sales.
  label text not null,

  description text null,

  -- Không xóa cứng chức vụ đã dùng; chỉ chuyển sang không còn sử dụng.
  is_active boolean not null default true,

  -- Thứ tự hiển thị trên giao diện.
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Code do hệ thống tạo từ tên chức vụ, không cho ký tự lạ.
  constraint job_positions_code_format
    check (code ~ '^[a-z0-9_]{2,50}$'),

  constraint job_positions_label_not_blank
    check (length(trim(label)) > 0)
);

comment on table public.job_positions is
  'Danh sách chức vụ động do Access Control quản lý.';

-- ============================================================================
-- 2. Gán một chức vụ chính cho một user.
-- ============================================================================
-- user_id là primary key nên một user chỉ có tối đa một chức vụ trong V1.

create table public.user_positions (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  position_code text not null
    references public.job_positions(code)
    on delete restrict,

  assigned_at timestamptz not null default now(),

  -- Ai đã gán chức vụ. Có thể null nếu tài khoản người gán không còn profile.
  assigned_by uuid null
    references public.profiles(id)
    on delete set null
);

comment on table public.user_positions is
  'Chức vụ chính hiện tại của từng user trong CRM V1.';

-- Phục vụ lọc danh sách nhân viên theo chức vụ.
create index idx_user_positions_position_code
  on public.user_positions (position_code);

-- Phục vụ truy vết các lần phân công theo người thực hiện.
create index idx_user_positions_assigned_by
  on public.user_positions (assigned_by);

-- ============================================================================
-- 3. Permission thuộc từng chức vụ.
-- ============================================================================
-- Khóa chính kép không cho gán trùng cùng một permission hai lần.

create table public.position_permissions (
  position_code text not null
    references public.job_positions(code)
    on delete cascade,

  permission_code text not null
    references public.permissions(code)
    on delete cascade,

  primary key (position_code, permission_code)
);

comment on table public.position_permissions is
  'Danh sách permission được cấp cho từng chức vụ.';

-- Phục vụ lúc cần tìm những chức vụ đang dùng một permission.
create index idx_position_permissions_permission_code
  on public.position_permissions (permission_code);

-- ============================================================================
-- 4. Không cho client đọc/ghi trực tiếp bảng phân quyền.
-- ============================================================================
-- Các bước sau sẽ dùng RPC security definer có kiểm tra users.manage.

alter table public.job_positions enable row level security;
alter table public.user_positions enable row level security;
alter table public.position_permissions enable row level security;

commit;