# lib/auth/ — Agent overview

## Role
Supabase JWT verification, break-glass admin, rate limiting, and auth audit.

## Contents
- `supabase-jwt.ts`, `supabase-ssr.ts`, `supabase-cookie-names.ts`, `session.ts` — Supabase-issued JWT verification via JWKS and server-only SSR cookie handling.
- `mask-email.ts` — pure helper to mask login email for CRM chrome (topbar welcome).
- `break-glass*.ts`, `rate-limit.ts`, `request-origin.ts`, `security-audit.ts`, `cookie-hygiene.ts` — recovery access and auth hardening.
- `break-glass-supabase.ts` — hidden shadow Auth user (`breakglass.internal@invalid`) with technical `super_admin` (excluded from Access Control directory).
- `access-control-admin.ts` — Supabase Admin API server-only để tạo Auth user từ Access Control.

## Boundaries
- API routes: `app/api/auth`; riêng `access-control-admin.ts` chỉ được Route Handler Access Control phía server gọi. Captcha UI: `components/auth`.
- Never return access or refresh credentials in JSON, logs, or client-side storage.
- Do not assign `super_admin` through Access Control RPCs; only the break-glass shadow bootstrap may upsert that role.
