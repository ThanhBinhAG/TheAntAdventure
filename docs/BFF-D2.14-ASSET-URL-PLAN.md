# D2.14 — Storage and CRM-origin asset URLs (plan)

**Date:** 2026-08-31  
**Owner:** Dev 2  
**Related:** [`BFF-TASK.md`](BFF-TASK.md) D2.14, [`photo-pipeline-boundaries`](../.cursor/rules/photo-pipeline-boundaries.mdc)

## Goal

Every image the browser loads must use a **CRM-origin URL** (`/api/photos/file`, `/api/branding/logo/file`, etc.). API DTOs must not return `*.supabase.co/storage/v1/...` or internal gateway hostnames.

## Current state (2026-08-31)

### Already on CRM routes

| Surface | Server normalization | Browser route |
|---------|---------------------|---------------|
| Gallery photos | [`lib/gallery/gallery-photo-dto.ts`](../lib/gallery/gallery-photo-dto.ts) → `crmGalleryAssetUrl` | `/api/photos/file?path=...` |
| Gallery upload complete | [`lib/storage/upload-gallery-photo-server.ts`](../lib/storage/upload-gallery-photo-server.ts) | Returns CRM URLs in response |
| Company logo | [`mapBrandingLogoUrlForClient`](../lib/gallery/gallery-asset-url.ts) | `/api/branding/logo/file` |
| Logo API GET | [`app/api/branding/logo/route.ts`](../app/api/branding/logo/route.ts) | Should return CRM file URL, not raw Storage public URL |
| Client pass-through | [`lib/gallery/storage-image-src.ts`](../lib/gallery/storage-image-src.ts) | `toCrmPhotoAssetUrl` identity (no legacy parsing in bundle) |
| Proposal export | [`lib/proposals/proposal-image-inliner.ts`](../lib/proposals/proposal-image-inliner.ts) | Inlines CRM file routes server-side |

### Legacy URL helpers (server-only target)

| Module | Purpose |
|--------|---------|
| [`lib/gallery/gallery-asset-url.ts`](../lib/gallery/gallery-asset-url.ts) | `isLegacyPhotosBucketPublicUrl`, `legacyPublicUrlToCrmGalleryUrl` |
| [`lib/storage/photo-paths.ts`](../lib/storage/photo-paths.ts) | `PHOTOS_BUCKET_PUBLIC_URL_PREFIX` |
| [`lib/guides/guide-avatar.ts`](../lib/guides/guide-avatar.ts) | Legacy Storage path regex |

These must stay **server-only** or be deleted once no DB rows store public Supabase URLs.

---

## D2.14 checklist mapping

### Asset URL rules

- [ ] Audit all browser `<img>` / `next/image` src values — no Supabase hostname in Network tab after full navigation.
- [ ] API JSON audit — grep responses for `supabase.co`, `storage/v1`, `supabase-ant-crm-gateway`.
- [ ] Seed/migration data — convert any stored public URLs to storage paths + CRM file routes.

### Company logo

- [x] CRM asset endpoint exists (`/api/branding/logo`, `/api/branding/logo/file`).
- [ ] Confirm `GET /api/branding/logo` always returns `crmBrandingLogoFileUrl` (never raw Storage URL).
- [ ] Sidebar / About / proposal templates use mapped client URL only.

### DTO photo normalization

| DTO / surface | Status | Action |
|---------------|--------|--------|
| Gallery photo DTO | Done | Keep contract test |
| Product photo refs | Verify | Ensure product list/detail uses CRM URLs |
| Attraction photos | Verify | `AttractionEditModal` gallery pick |
| Guide avatar | Partial | `/api/guides/avatar` + `guide-avatar-client.ts` |
| Weather destination images | Verify | Weather boot DTO |
| Proposal export images | Done (server inliner) | E2E export spot-check |

### `storage-image-src.ts`

- [x] No Supabase public env reads.
- [x] No direct Supabase browser URL construction.
- [x] CRM-origin pass-through only.

### Asset tests (to add or extend)

- [ ] Unauthenticated `GET /api/photos/file` → 401
- [ ] Forbidden path / wrong tenant → 403 or 404
- [ ] Invalid path → 400
- [ ] Missing object → 404
- [ ] Correct `Content-Type`
- [ ] Cache headers (`Cache-Control`, optional ETag)
- [ ] Response headers/body do not leak Supabase URL

Existing: [`tests/gallery-asset-url.test.ts`](../tests/gallery-asset-url.test.ts) — extend for branding + cross-domain DTOs.

---

## Implementation phases

### Phase 1 — Inventory (read-only)

1. Grep codebase for `.supabase.co`, `/storage/v1/object`, `PHOTOS_BUCKET_PUBLIC_URL_PREFIX` in `components/` and `hooks/`.
2. Capture Network tab on: Gallery, Products, Attractions, Guides, Weather, Proposals export, Sidebar logo.
3. List API routes still returning legacy URLs in JSON.

### Phase 2 — Server DTO hardening

1. Centralize `mapPhotoUrlForClient(row)` in gallery helper; call from every photo-bearing repository.
2. Branding: ensure `fetchCompanyLogoUrl` storage path → `crmBrandingLogoFileUrl` before JSON.
3. Guide avatar upload response — CRM file route only.
4. Weather destination image fields — same pattern if stored paths exist.

### Phase 3 — Data migration (if needed)

1. SQL or script: update `photos.url` / related columns from public URLs to storage paths (if any legacy rows).
2. Re-verify gallery list API returns only `/api/photos/file?...`.

### Phase 4 — Tests and acceptance

1. Extend `gallery-asset-url.test.ts` + add `branding-asset-url.test.ts`.
2. Playwright: assert no `supabase.co` in Fetch/XHR for asset loads (img may still need allowlist during transition).
3. Update [`Personal/docs/stage-1/checklist.md`](../Personal/docs/stage-1/checklist.md) note on Storage CDN display.

---

## Boundaries

- Upload pipeline unchanged: init → chunk → complete ([`lib/gallery/photo-api.ts`](../lib/gallery/photo-api.ts)).
- Sharp / service-role writes stay server-only ([`lib/image-pipeline/`](../lib/image-pipeline/), [`lib/storage/`](../lib/storage/)).
- Do not add `NEXT_PUBLIC_SUPABASE_*` for URL building.

## Suggested branch

```text
feature/bff-dev2-crm-origin-asset-urls
```

## Dependency

Can run **in parallel** with D2.13 after D2.12 PASS; D2.14 does not block D2.13 stack removal but **does** block final acceptance section E in BFF-TASK.
