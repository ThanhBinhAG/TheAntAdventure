# app/api/planner/all — Agent overview

## Role
BFF Route Handler phục vụ hydration toàn bộ danh sách tasks lên Zustand store cho client.

## Contents
- `route.ts` — GET danh sách tasks.

## Boundaries
- Yêu cầu quyền `planner.read`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `tasks`.
