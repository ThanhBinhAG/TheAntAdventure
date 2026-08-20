# app/api/tour-design — Agent overview

## Role
BFF Route Handlers cho tính năng thiết kế Tour (Tour Design & Outlines).

## Contents
- `save/route.ts` — POST lưu atomically draft và thay thế các ngày hành trình qua PostgreSQL RPC transaction.
- `drafts/all/route.ts` — GET toàn bộ danh sách tour drafts cho client hydration.
- `outlines/all/route.ts` — GET toàn bộ danh sách tour outline days cho client hydration.

## Boundaries
- Quyền đọc yêu cầu `tour_design.read`, quyền ghi yêu cầu `tour_design.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `tour_drafts` và `tour_outline_days`.
