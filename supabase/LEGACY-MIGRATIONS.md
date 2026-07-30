# Legacy SQL patches (`migrate-*.sql`)

These files predate Supabase CLI adoption. **New schema changes go in [`migrations/`](./migrations/)** via `npm run db:migration:new`.

## Status (incorporated into `schema.sql`)

All patches below are reflected in [`schema.sql`](./schema.sql) for fresh installs. On an **existing** remote DB that was set up via SQL Editor, assume they were already applied unless Table Editor shows missing tables/columns.

| File | Purpose | In `schema.sql` |
|------|---------|-----------------|
| `migrate-tour-design.sql` | `tour_drafts`, `tour_outline_days` | Yes |
| `migrate-attractions.sql` | `attractions`, `attraction_photos` | Yes |
| `migrate-attraction-photo-pool.sql` | Attraction photo pool columns | Yes |
| `migrate-hotels.sql` | Hotel-related columns | Yes |
| `migrate-outline-workflow.sql` | Outline workflow columns | Yes |
| `migrate-outline-export.sql` | Outline export fields | Yes |
| `migrate-photo-storage.sql` | Storage bucket + `photos` paths | Partial — run once per project |
| `migrate-photo-library.sql` | `product_photos`, backfill | Yes |
| `migrate-photo-gallery-pairs.sql` | Gallery pair helpers | Yes |
| `migrate-pricing-catalogs.sql` | Pricing workbook tables | Yes |
| `migrate-weather-cache.sql` | Weather forecast cache tables | Yes |

## One-time ops (not CLI migrations)

| File | When to run |
|------|-------------|
| `reset-v5.sql` | DEV only — drop all CRM tables |
| `import-v5-data.sql` | After schema on empty DB |
| `verify-counts-v5.sql` | After import |
| `rls-authenticated.sql` | After Auth login works |
| `fix-product-photos-rls.sql` | If `product_photos` RLS blocks inserts |
| `wipe-photo-library.sql` | Manual photo wipe (destructive) |

## CLI incremental migrations (`migrations/`)

| Version | File | Change |
|---------|------|--------|
| `20260101000000` | `baseline_v5_schema.sql` | No-op marker — schema existed before CLI |
| `20260711` | `bookings_lead_id.sql` | `bookings.lead_id` + unique index |
| `20260713` | `products_notes_to_sales.sql` | `products.notes_to_sales` |

After linking or setting `SUPABASE_DB_URL`, bootstrap an existing DB:

```bash
npm run db:bootstrap
```
