# Supabase setup (v5)

Step-by-step guide to initialize the CRM database on Supabase and connect the Next.js app.

Schema reference: [`DATABASE.md`](./DATABASE.md)

## SQL files

| File | Purpose |
|------|---------|
| `supabase/reset-v5.sql` | Drop all CRM tables — use before a clean reinstall |
| `supabase/schema.sql` | Create 35+ relational tables, indexes, dev RLS |
| `supabase/import-v5-data.sql` | Seed / production data (run after schema) |
| `supabase/verify-counts-v5.sql` | Verify row counts after import |

## 1. Supabase SQL Editor (in order)

Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.

### 1a. Reset (optional)

If a previous import failed or you need a fresh start:

1. Paste and run `supabase/reset-v5.sql`
2. Wait for success

### 1b. Create schema

1. Paste and run the full `supabase/schema.sql` (one run, do not split)
2. Confirm in Table Editor: `customers`, `bookings`, `products`, etc.

### 1c. Import data

1. Paste and run `supabase/import-v5-data.sql`
2. If the editor times out, split by `-- MODULE …` comments (agents → customers → products → …)

### 1d. Verify

1. Run `supabase/verify-counts-v5.sql`
2. Every row: `rows` column must equal `expected`

Expected highlights: `customers: 27`, `products: 196`, `booking_itinerary: 33`, `booking_activities: 70`.

## 2. App configuration

`.env.local`:

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_AUTO_SYNC=true
```

```bash
npm run dev
```

- Supabase panel appears in the app (☁ banner)
- With Supabase enabled, the app hydrates from remote — not localStorage as source of truth
- Edits auto-sync to PostgreSQL (e.g. bookings + itinerary + activities)

## 3. Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `relation "customers" does not exist` | Schema not applied | Run `schema.sql` first |
| `relation "every" does not exist` | Broken SQL quotes or wrong import file | Use `import-v5-data.sql` only (dollar-quoted strings) |
| FK violation | Import order / missing parent row | Re-run from `reset-v5.sql`, then schema → import in order |
| App shows empty data | Env vars wrong or RLS blocking | Check URL/key; verify row counts in Table Editor |

## 4. Verify JSONB is gone (optional)

CRM tables use typed columns, not `data jsonb`. In SQL Editor:

```sql
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE data_type = 'jsonb'
  AND table_schema IN ('public', 'dev');
```

Expected: **0 rows** for your CRM schemas.

## 5. Ongoing data updates

- **Recommended:** edit in the app with `NEXT_PUBLIC_SUPABASE_AUTO_SYNC=true`
- **Bulk:** re-run `import-v5-data.sql` (UPSERT) or use the in-app backup → push flow

## Tables (v5)

```
agents, customers, products, guides, guide_reviews,
leads, bookings, booking_itinerary, booking_activities, booking_changes,
comms, finance, accounts_receivable, accounts_payable, tax_reports,
staff, salary_records, tasks, contracts, feedback,
suppliers, supplier_tags, cruises, transport, restaurants,
photos, photo_tags, cal_events,
chat_channels, chat_messages, chat_reactions, dev_notes
```
