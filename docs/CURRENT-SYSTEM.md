# Current CRM System

## Purpose

This is the evidence-based post-BFF platform map, last reconciled on 2026-08-28. It records implemented source controls and separately names deployment and browser-cutover work that still needs proof.

## Components

| Component | Runtime responsibility | Network role |
| --- | --- | --- |
| Browser | Renders the CRM UI and holds UI state | Auth and business calls use the CRM origin; no Supabase credential or session token is exposed. One Dev 2 Storage asset path still needs removal. |
| CRM app | Next.js 16 BFF, auth/session boundary, API routes, PDF and image work | Production container exposes port 3006 only to the reverse-proxy network. |
| Supabase | Auth, PostgREST, Storage, and PostgreSQL business data | CRM server uses server-only `SUPABASE_URL`; production target is the private gateway `http://supabase-ant-crm-gateway:8000`. |
| Redis | Optional cache for selected server reads and authorization data | Production has no host port; a Redis failure must fall back to the durable source of truth. |
| Reverse proxy | Public TLS ingress to CRM | The intended only public service on ports 80/443; production proof remains an Ops gate. |

## Request paths

```text
Browser ──HTTPS──> Reverse proxy ──private──> CRM Next.js :3006
CRM     ──private──> Supabase gateway / Auth / Storage
CRM     ──private──> Redis (optional cache)
Browser ──temporary Dev 2 asset path──> Supabase Storage `/storage/v1`
```

`docker-compose.yml` is the private production topology: the CRM joins an external reverse-proxy network and private service networks, while `docker-compose.local.yml` deliberately retains loopback ports for development. The real Supabase stack is operated separately, so its public-port removal, firewall rules, DNS isolation, and running-container topology require an Ops deployment check.

## Authentication and authorization

Login, refresh, logout, Proxy, and `getAuthContext()` use a durable CRM session. The browser receives only the opaque HttpOnly `crm_session` cookie; Supabase access and refresh credentials are encrypted in the server-side session store. A verified context keeps the access token request-local and can create a user-scoped server client. `bffRoute` returns safe `503` responses for temporary auth/JWKS unavailability and standardizes request IDs and structured server logging.

Redis is not a session source of truth. Cache reads and writes degrade safely when Redis is unavailable; durable sessions and authorization behavior continue through server storage/Supabase according to their permission boundary.

## Remaining cutover work

One known Dev 2 browser asset dependency still emits `/storage/v1` in `.next/static`; therefore the hard browser-leakage gate currently fails. Real durable-session E2E requires the session migration on an isolated mutable Supabase target. Production acceptance additionally requires the deploy verifier, public-port/DNS isolation proof, firewall review, and key rotation after browser leakage is eliminated.
