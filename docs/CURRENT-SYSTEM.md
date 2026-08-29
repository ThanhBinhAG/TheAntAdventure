# Current CRM System

## Purpose

This is the evidence-based post-BFF platform map, last reconciled on 2026-08-29. It records implemented source controls and separately names deployment work that still needs proof.

## Components

| Component | Runtime responsibility | Network role |
| --- | --- | --- |
| Browser | Renders the CRM UI and holds UI state | Auth and business calls use the CRM origin; no Supabase credential or session token is exposed. |
| CRM app | Next.js 16 BFF, auth/session boundary, API routes, PDF and image work | Production container retains `${APP_PORT:-3006}:3006` for the existing Ops-managed ingress. |
| Supabase | Auth, PostgREST, Storage, and PostgreSQL business data | CRM server uses server-only `SUPABASE_URL`; production target is the private gateway `http://supabase-ant-crm-gateway:8000`. |
| Redis | Optional cache for selected server reads and authorization data | Production has no host port; a Redis failure must fall back to the durable source of truth. |
| Existing ingress/proxy | Public routing to CRM | Operated outside this repository; it must keep targeting the configured CRM host port. |

## Request paths

```text
Browser ──HTTPS──> Existing ingress/proxy ──host upstream──> CRM Next.js :3006
CRM     ──private──> Supabase gateway / Auth / Storage
CRM     ──private──> Redis (optional cache)
```

`docker-compose.yml` preserves the existing CRM host-port upstream and joins the private Supabase/Redis service networks. Proxy configuration is not owned or validated by this repository. The real Supabase stack is operated separately, so its public-port removal, firewall rules, DNS isolation, and running-container topology require an Ops deployment check.

## Authentication and authorization

Login, refresh, logout, Proxy, and `getAuthContext()` use a durable CRM session. The browser receives only the opaque HttpOnly `crm_session` cookie; Supabase access and refresh credentials are encrypted in the server-side session store. A verified context keeps the access token request-local and can create a user-scoped server client. `bffRoute` returns safe `503` responses for temporary auth/JWKS unavailability and standardizes request IDs and structured server logging.

Redis is not a session source of truth. Cache reads and writes degrade safely when Redis is unavailable; durable sessions and authorization behavior continue through server storage/Supabase according to their permission boundary.

## Remaining cutover work

The hard browser-leakage gate passes after the private asset/BFF cutover. Production acceptance additionally requires the durable-session migration, private dependency verifier, Supabase DNS/port isolation proof, firewall review, and planned key rotation.
