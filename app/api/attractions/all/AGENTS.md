# app/api/attractions/all — Agent overview

## Role
BFF Route Handler phục vụ hydration toàn bộ danh sách địa điểm tham quan kèm ảnh lên Zustand store cho client.

## Contents
- `route.ts` — GET danh sách địa điểm tham quan.

## Boundaries
- Yêu cầu quyền `attractions.read`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `attractions`.
