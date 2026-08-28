# lib/auth/ — Agent overview

## Role
Supabase JWT verification, break-glass admin, rate limiting, and auth audit.

## Contents
- `crm-session-crypto.ts`, `crm-session-cookie.ts`, `crm-session-repository.ts`, `session.ts` — opaque CRM session cookie, server-only encrypted Supabase credentials, and JWT/Authz context.
- `supabase-auth-server.ts`, `supabase-jwt.ts` — server-only Supabase Auth calls and JWKS verification.
- `mask-email.ts` — pure helper to mask login email for CRM chrome (topbar welcome).
- `break-glass*.ts`, `rate-limit.ts`, `request-origin.ts`, `security-audit.ts`, `cookie-hygiene.ts` — recovery access and auth hardening.
- `break-glass-supabase.ts` — hidden shadow Auth user (`breakglass.internal@invalid`) with technical `super_admin` (excluded from Access Control directory).
- `access-control-admin.ts` — Supabase Admin API server-only để tạo Auth user từ Access Control.

## Boundaries
- API routes: `app/api/auth`; riêng `access-control-admin.ts` chỉ được Route Handler Access Control phía server gọi. Captcha UI: `components/auth`.
- Never return access or refresh credentials in JSON, logs, or client-side storage.
- Do not assign `super_admin` through Access Control RPCs; only the break-glass shadow bootstrap may upsert that role.
