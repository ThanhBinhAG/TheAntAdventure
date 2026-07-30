# Legacy SQL patches (archived)

Pre-CLI `migrate-*.sql` patches were **squashed** into:

- [`../migrations/20260101000000_baseline_v5_schema.sql`](../migrations/20260101000000_baseline_v5_schema.sql)
- [`../schema.sql`](../schema.sql) (SQL Editor mirror)

Those flat patch files have been **removed**. Do not add new files here.

## Ops scripts (still at `supabase/` root — not migrations)

| File | When to run |
|------|-------------|
| `reset-v5.sql` | DEV only — drop all CRM tables |
| `import-v5-data.sql` | After schema on empty DB |
| `verify-counts-v5.sql` | After import |
| `rls-authenticated.sql` | After Auth login works |
| `fix-product-photos-rls.sql` | If `product_photos` RLS blocks inserts |
| `wipe-photo-library.sql` | Manual photo wipe (destructive) |

## Existing remote (schema already applied)

```bash
npm run db:bootstrap   # marks 20260101000000 applied without re-running DDL
```

New schema changes: `npm run db:migration:new` → edit → `npm run db:push`. See [`docs/SUPABASE-SETUP.md`](../../docs/SUPABASE-SETUP.md) §9.
