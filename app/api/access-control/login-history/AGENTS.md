# app/api/access-control/login-history/ — Agent overview

## Role

API đọc lịch sử đăng nhập và metadata bảo mật của user.

## Contents

- `route.ts` — GET lịch sử đăng nhập có phân trang và bộ lọc.

## Boundaries

Chỉ kiểm tra request và gọi `lib/access-control`; không truy cập Supabase trực tiếp.