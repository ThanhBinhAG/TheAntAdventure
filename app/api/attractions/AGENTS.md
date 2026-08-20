# app/api/attractions — Agent overview

## Role
BFF Route Handler cho tính năng địa điểm tham quan (Attractions & Attraction Photos).

## Contents
- `route.ts` — POST tạo địa điểm, PATCH cập nhật thông tin địa điểm và liên kết ảnh, DELETE xóa địa điểm.
- `all/route.ts` — GET toàn bộ danh sách địa điểm tham quan cho client hydration.

## Boundaries
- Quyền đọc yêu cầu `attractions.read`, quyền ghi yêu cầu `attractions.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `attractions` và `attraction_photos`.
