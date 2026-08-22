# lib/auth/ — Agent overview

## Role
Server session, break-glass admin, and rate limiting.

## Contents
- `crm-session.ts`, `crm-session-store.ts` — encrypted PostgreSQL-backed CRM sessions; Redis is optional revoke acceleration only.
- `session.ts`, `break-glass*.ts`, `rate-limit.ts`, `cookie-hygiene.ts` (clear sb-* chunks + Cookie header size estimate)
- `access-control-admin.ts` — Supabase Admin API server-only để tạo Auth user từ Access Control.

## Boundaries
- API routes: `app/api/auth`; riêng `access-control-admin.ts` chỉ được Route Handler Access Control phía server gọi. Captcha UI: `components/auth`.
- Session persistence uses a server-only service role; never grant browser roles access to `crm_sessions`.
