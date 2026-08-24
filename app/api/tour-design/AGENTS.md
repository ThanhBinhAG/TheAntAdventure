# app/api/tour-design — Agent overview

## Role
BFF Route Handlers cho tính năng thiết kế Tour (Tour Design & Outlines).

## Contents
- `save/route.ts` — POST lưu atomically draft và thay thế các ngày hành trình qua PostgreSQL RPC transaction.
- `drafts/route.ts` — GET một draft theo `id` hoặc drafts theo các `leadIds` đang cần trên màn hình.
- `outlines/route.ts` — GET outline days của một `draftId` đang được mở.
- `drafts/all/route.ts` — GET toàn bộ danh sách tour drafts cho client hydration.
- `outlines/all/route.ts` — GET toàn bộ danh sách tour outline days cho client hydration.
- `crm-context/route.ts` — GET customers + leads cho Client Brief và Sales handoff queue (`tour_design.read`).

## Boundaries
- Quyền đọc yêu cầu `tour_design.read`, quyền ghi yêu cầu `tour_design.write`.
- Không sử dụng trực tiếp Supabase client ở client-side cho bảng `tour_drafts` và `tour_outline_days`.
