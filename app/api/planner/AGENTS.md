# app/api/planner — Agent overview

## Role
BFF Route Handler cho tính năng Daily Planner (danh sách công việc/tasks).

## Contents
- `route.ts` — POST tạo task, PATCH cập nhật task, DELETE xóa task.
- `all/route.ts` — GET toàn bộ danh sách tasks cho client hydration.

## Boundaries
- Quyền đọc yêu cầu `planner.read`, quyền ghi yêu cầu `planner.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `tasks`.
