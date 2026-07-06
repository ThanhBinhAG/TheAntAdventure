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

### Sync safety (v5.1+)

The app protects against accidental bulk data loss:

1. **Hydrate gate** — auto-sync waits until Supabase data is loaded (no sync on empty startup state).
2. **Catalogue upsert-only** — `products` and `product_pricing` are never bulk-deleted via orphan sync; explicit UI delete removes one row at a time.
3. **Regression guard** — other tables skip orphan-delete when local row count drops more than 10% below the hydrate baseline.

Panel ☁ shows hydrate status, blocked sync warnings, and **Push có xác nhận** for manual override.

## 5b. Môi trường DEV vs PROD

**Never run `npm run dev` against the production Supabase project** without safeguards.

| | DEV (local) | PROD (deploy) |
|--|-------------|---------------|
| Supabase project | Separate dev instance | Production instance |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC` | `false` recommended | `true` |
| `NEXT_PUBLIC_SUPABASE_READ_ONLY` | `true` if you must share prod DB | `false` |
| `reset-v5.sql` | Dev only | Never |
| `import-v5-data.sql` | Dev for testing | Only with backup |

### Setup dev project

1. Create a second Supabase project (or second self-hosted instance).
2. Run `schema.sql` → `import-v5-data.sql` on dev only.
3. Point `.env.local` at dev URL + anon key.
4. Use `NEXT_PUBLIC_SUPABASE_AUTO_SYNC=false` or `READ_ONLY=true` while experimenting.

### Checklist before `npm run dev`

- [ ] `.env.local` URL is the **dev** project (not production)
- [ ] `AUTO_SYNC=false` or `READ_ONLY=true` when testing risky changes
- [ ] Run **Verify counts** in ☁ panel after large imports

### Backup (production)

- Run `supabase/verify-counts-v5.sql` periodically (`products` expected: **196**).
- Take a DB snapshot (`pg_dump` or host backup) before bulk SQL imports.

## 6. Đăng nhập (local + test + production)

**Local và production đều bắt buộc đăng nhập** — 

### Bước 1 — Tạo tài khoản trên Supabase

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → project của bạn.
2. **Authentication** → **Providers** → **Email**: giữ bật.
3. **Authentication** → **Sign In / Providers** → **tắt** *Enable email signups* (không cho đăng ký công khai).
4. **Authentication** → **Users** → **Add user** → **Create new user**:
   - Email: email bạn dùng hàng ngày (vd. `ban@example.com`)
   - Password: mật khẩu bạn tự đặt
   - Bật **Auto Confirm User** để không cần xác nhận email khi test.
5. Lặp lại bước 4 cho từng người test khác.

### Bước 2 — Cấu hình `.env.local`

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_AUTO_SYNC=true

# CAPTCHA — để trống khi dev local (bỏ qua Turnstile)
NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY=
```

Lấy URL và anon key tại: **Project Settings** → **API**.

### Bước 3 — Chạy app và đăng nhập

```bash
npm run dev
```

1. Mở `http://localhost:3006` → tự redirect sang `/login`.
2. Nhập email + password vừa tạo ở Bước 1.
3. Sau khi đăng nhập → vào `/dashboard`, dữ liệu hydrate từ Supabase như bình thường.
4. **Logout** ở góc Topbar khi cần.

### Bước 4 — Siết RLS (sau khi login chạy ổn)

**Chỉ chạy khi** bạn đã đăng nhập thành công và app load được data:

1. SQL Editor → paste và chạy `supabase/rls-authenticated.sql`
2. Refresh app — vẫn phải đăng nhập; data vẫn load bình thường.
3. Nếu chưa login mà gọi API Supabase trực tiếp → bị chặn (đúng như mong muốn).

| File | Mục đích |
|------|----------|
| `supabase/rls-authenticated.sql` | Thay `dev_allow_all` → chỉ role `authenticated` |

### (Tùy chọn) CAPTCHA khi deploy public

1. Tạo site trên [Cloudflare Turnstile](https://dash.cloudflare.com/) → lấy **Site key** + **Secret key**.
2. Supabase → **Authentication** → **Bot and Abuse Protection** → bật Turnstile, dán secret key.
3. `.env.local` / production env: `NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY=<site-key>`

## 7. Troubleshooting / Debug mode

Khi login fail (SSL, không kết nối Supabase, env sai), bật debug tạm trên server:

### Bước 1 — Env trên server

```env
SYSTEM_DEBUG=true
SYSTEM_DEBUG_TOKEN=<random-string-32-chars>
```

Rebuild và restart:

```bash
npm run build && pm2 restart crm
```

### Bước 2 — Trang diagnostics (browser)

```
https://your-domain.com/system/debug?token=<SYSTEM_DEBUG_TOKEN>
```

Trang hiển thị:
- Check env, proxy headers (nginx), Supabase Auth/REST reachability từ **phía server**
- Recent logs (middleware, auth, diagnostics)
- Hướng dẫn lệnh SSH

Trang login cũng hiện link "System diagnostics" khi `SYSTEM_DEBUG=true`.

### Bước 3 — Log stdout (SSH)

```bash
pm2 logs crm --lines 200 | grep system-debug
# hoặc
journalctl -u your-service -n 200 | grep system-debug
```

Mỗi dòng log là JSON có `"tag":"system-debug"`.

### Bước 4 — Checklist SSL nginx (admin server)

```bash
curl -vI https://your-domain.com 2>&1 | head -40
curl -sI "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health"
```

Nginx cần có:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_pass http://127.0.0.1:3006;
```

### Bước 5 — Tắt debug sau khi fix

```env
SYSTEM_DEBUG=false
```

Restart app. Debug routes trả **404** khi tắt.

| API | Mô tả |
|-----|--------|
| `GET /api/system/diagnostics` | Full report (cần header `X-Debug-Token`) |
| `GET /api/system/logs` | Ring buffer logs |
| `POST /api/system/log` | Auth events từ login (chỉ khi debug bật) |

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
