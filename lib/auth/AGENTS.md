# lib/auth/ — Agent overview

## Role
Server session, break-glass admin, and rate limiting.

## Contents
- `crm-session.ts`, `crm-access-token.ts`, `crm-session-store.ts` — encrypted PostgreSQL-backed refresh sessions, optional short-lived JWT access credentials, and Redis revoke acceleration.
- `session.ts`, `break-glass*.ts`, `rate-limit.ts`, `cookie-hygiene.ts` (clear sb-* chunks + Cookie header size estimate)
- `break-glass-supabase.ts` — hidden shadow Auth user (`breakglass.internal@invalid`) with technical `super_admin` (excluded from Access Control directory); CRM session `isBreakGlass` remains the privilege source
- `access-control-admin.ts` — Supabase Admin API server-only để tạo Auth user từ Access Control.

## Boundaries
- API routes: `app/api/auth`; riêng `access-control-admin.ts` chỉ được Route Handler Access Control phía server gọi. Captcha UI: `components/auth`.
- Session persistence uses a server-only service role; never grant browser roles access to `crm_sessions`.
- Do not assign `super_admin` through Access Control RPCs; only the break-glass shadow bootstrap may upsert that role.
