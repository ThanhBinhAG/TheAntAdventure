# Supabase setup (v5)

Step-by-step guide to initialize the CRM database on Supabase and connect the Next.js app.

Schema reference: [`DATABASE.md`](./DATABASE.md)

## SQL files (colleague run order)

Remember: **schema → import → (verify) → Auth → RLS**. Do not run any deleted `legacy/migrate-*.sql` patches.

| Step | File | Purpose |
|------|------|---------|
| 0 (optional DEV) | `supabase/reset-v5.sql` | Drop all CRM tables — clean reinstall only |
| 1 | `supabase/schema.sql` | Full DDL (tables, indexes, Storage, `dev_allow_all` RLS). Same content as CLI baseline `migrations/20260101000000_baseline_v5_schema.sql` |
| 2 | `supabase/import-v5-data.sql` | Seed / production data |
| 3 (optional) | `supabase/verify-counts-v5.sql` | Verify row counts after import |
| 4 | App + Auth | `.env.local`, create user, confirm `/login` works |
| 5 | `supabase/rls-authenticated.sql` | Production RLS (`authenticated_access`) |
| only if needed | `supabase/fix-product-photos-rls.sql` | If `product_photos` RLS blocks inserts |
| ops | `supabase/wipe-photo-library.sql` | Manual photo wipe (destructive) |

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

### 1e. Auth then RLS

1. Configure Auth and app env (see §2 and Auth sections below)
2. Confirm login works
3. Run `supabase/rls-authenticated.sql`

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

## 5b. Môi trường DEV (local) vs PROD (khách / remote)

**Never run `npm run dev` against the customer/production Supabase** without safeguards. App connects to **one** DB at a time via env.

| | Local (dev) | Remote (khách / demo) |
|--|-------------|------------------------|
| Env file | `.env.local` | Server env, or gitignored `.env.remote.local` backup |
| Supabase | Docker via `npx supabase start` | Self-hosted / Cloud instance |
| API URL | `http://127.0.0.1:54321` | e.g. `https://sb.example.com` |
| Migration | `npm run db:push:local` | `npm run db:push` + `SUPABASE_DB_URL` |
| Status | `npm run db:status:local` | `npm run db:status` |
| `NEXT_PUBLIC_SUPABASE_AUTO_SYNC` | `false` recommended at first | `true` when ready |
| `reset-v5.sql` / wipe | Dev only | Never on customer DB |

### Setup local (recommended daily workflow)

1. `npx supabase start` (Docker required).
2. Copy keys from `npx supabase status -o env` into `.env.local` (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, DB URL on port `54322`).
3. Keep customer credentials in `.env.remote.local` (gitignored) — do **not** use them for day-to-day `npm run dev`.
4. New schema: edit `supabase/migrations/` → `npm run db:push:local` → test → only then push remote.

### Setup / push remote (customer)

1. Put Postgres URL in env as `SUPABASE_DB_URL` (see §9a).
2. Existing DB without CLI history: `npm run db:bootstrap` first.
3. `npm run db:push` (never `--local`).

### Checklist before `npm run dev`

- [ ] `.env.local` URL is **local** (`127.0.0.1:54321`) or an explicit shared **dev** instance — not production
- [ ] `AUTO_SYNC=false` or `READ_ONLY=true` when testing risky changes against a shared DB
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

### JWT access / refresh (khuyến nghị)

App dùng **Supabase Auth JWT** trong cookie HttpOnly (`@supabase/ssr`). Proxy gọi `getSession()` để refresh khi token sắp hết hạn, rồi `getClaims()` để xác minh identity — không tự mint access/refresh riêng cho user thường.

Trên Supabase Dashboard → **Authentication** → **Settings** (hoặc **Sessions**):

| Setting | Khuyến nghị | Ghi chú |
|---------|-------------|---------|
| JWT expiry (access token) | **900** giây (15 phút) | Token ngắn hạn; cookie được middleware làm mới |
| Refresh token | Giữ mặc định Supabase | Dùng để cấp access mới khi hết hạn |

Sau khi đổi JWT expiry, user đang đăng nhập có thể cần **logout rồi login lại**.

Login đi qua `POST /api/auth/login` (rate-limit theo IP: tối đa ~10 lần thất bại / 15 phút). Logout: `POST /api/auth/logout`.

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
https://your-domain.com/system/debug
```

Nhập `SYSTEM_DEBUG_TOKEN` trên form (token được gửi qua header `X-Debug-Token`, không dùng query string để tránh rò rỉ Referer/log).

Trang hiển thị:
- Check env, proxy headers (nginx), **Cookie header size**, Supabase Auth/REST reachability từ **phía server**
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

Nginx cần có (app listen `:3006`):

```nginx
client_max_body_size 20m;
large_client_header_buffers 4 16k;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_pass http://127.0.0.1:3006;
```

Ghi chú:

- **`large_client_header_buffers`** — tránh 400/502 khi Cookie header phình (Supabase auth JWT chunked `sb-*-auth-token.0/.1`). `localStorage` / `sessionStorage` **không** gửi lên nginx.
- **`proxy_read_timeout` / `proxy_send_timeout`** — gallery `complete` (Sharp) và PDF export có thể >60s; timeout ngắn → 502/504 dù app vẫn chạy.
- **`client_max_body_size`** — gallery chunk hiện **512 KB**; 20m để dư cho logo/multipart và PDF JSON body.
- 502 sau PDF/upload dài thường là **timeout hoặc OOM container** (`mem_limit`), không phải “tràn cache” trình duyệt.
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

## 8. Photo Storage (Library + Guides)

Photo Storage bucket DDL and `product_photos` are included in `schema.sql` / the CLI baseline. Fresh installs do **not** need separate photo migration files.

If Tour Product photos vanish on refresh with `new row violates row-level security policy for table "product_photos"`, run `supabase/fix-product-photos-rls.sql` (or re-run `rls-authenticated.sql`).

### Upload paths (required convention)

| Use | Storage path |
|-----|----------------|
| Library display | `gallery/{photoId}/display.webp` |
| Library thumbnail | `gallery/{photoId}/thumb.webp` |
| Guide avatar | `guides/{guideId}/avatar.webp` |

Bucket: **`photos`** (public). Users may pick JPEG/PNG/WebP of **any size** (including multi‑hundred MB / ~1 GB) — there is no hard per-file byte reject. The client always uploads the original via **chunked upload** (`init` → `chunk` × N → `complete`, 512 KB chunks streamed to temp disk). On `complete`, a **forked Sharp child** ([`lib/image-pipeline/sharp-worker.cjs`](../lib/image-pipeline/sharp-worker.cjs), disk→disk, `VIPS_DISC_THRESHOLD=8m`, concurrency **1**) builds display ≤1280px + thumb ≤400px WebP, isolated from the Next.js process. The assembled original is deleted from disk immediately after Sharp succeeds, before Storage upload. A per-user hourly quota (`lib/storage/gallery-upload-rate-limit.ts`) guards against abuse instead of a hard size cap. Stored objects are typically well under the bucket’s **5 MB** file-size limit (only display + thumb WebP — originals are never kept).

### Upload via app

Gallery → **Upload photos** → [`uploadPhotoViaApi`](../lib/gallery/photo-api.ts) → `init` / `chunk` / `complete` (server Sharp). Uploads run one-at-a-time in the Gallery UI. If the app sits behind nginx (or similar), set `client_max_body_size` to at least **~2 MB** (chunks are 512 KB; leave headroom for multipart framing). Prefer the full proxy snippet in **Bước 4 — Checklist SSL nginx** (`proxy_read_timeout 300s`, `large_client_header_buffers 4 16k`).

Tour Products attach photos via **Photo Library picker** → `product_photos` (not ownership on the photo row).

Guides → edit form → **Avatar photo** still uploads client-side to `guides/{guideId}/avatar.webp`.

Legacy owner-grouped paths (`gallery/tours/…`, `gallery/attractions/…`, `gallery/loose/…`) remain readable via stored `url` / `storage_path`; new uploads use the flat layout.

### Dev machine memory (WSL) — why uploads can kill the VM

**Image processing is not the memory problem.** Measured peak RSS of the forked Sharp worker, disk→disk with `VIPS_DISC_THRESHOLD=8m`:

| Input | Peak RSS | Time |
|-------|----------|------|
| JPEG 10000×10000 (100 MP, 29 MB) | ~105 MB | ~1 s |
| PNG 8000×8000 (64 MP, **178 MB** file) | ~106 MB | ~2.7 s |

libvips streams and shrinks on load, so peak RSS is flat regardless of input size or format. A 100 MB upload costs the API roughly **105 MB and a couple of seconds** — it does not scale with the file.

What actually kills the VM is total machine capacity. Real `oom-kill` events on a 7.4 GB WSL2 VM showed `global_oom` killing **`next-server` at 2.5–2.8 GB** — the dev server itself, never a Sharp worker. Measured on the same machine:

| Process | RSS |
|---------|-----|
| `npm run dev` (Next 14 dev server) | ~1 GB after one route, **2.5–2.8 GB with the app compiled** |
| local Supabase CLI stack (`supabase_*` containers) | **~2.4 GB** (`supabase_analytics`/logflare alone ~600 MB) |
| Cursor / VS Code server | ~700 MB |
| `npx eslint .` | ~860 MB |
| `npx tsc --noEmit` | ~535 MB |
| `npm test` | ~185 MB |

Dev server + Supabase stack + editor alone is ~5.6 GB of 7.4 GB. Any spike — a route compiling on first request, a lint run — pushes it over, and the kernel kills the largest process, which can take the whole VM down.

**Check this first.** `npx supabase start` leaves ~2.4 GB of containers running even when `.env.local` points at a remote Supabase, in which case the app never touches them. This stack has been torn down on the current dev machine; if you bring it back, expect to re-pull ~8.4 GB of images and to lose the RAM headroom below:

```bash
docker ps --format '{{.Names}}'   # supabase_*_TheAntAdventure listening on 54321-54327?
grep SUPABASE_URL .env.local      # pointing somewhere else entirely?
npx supabase stop                 # frees ~2.4 GB if you are not using the local stack
```

Then raise the ceiling in `%UserProfile%\.wslconfig` on Windows and run `wsl --shutdown`:

```ini
[wsl2]
memory=12GB
swap=8GB
```

Two guards are in place: `npm run dev` pins `--max-old-space-size=2048` so V8 collects aggressively and fails with a contained JS heap error rather than growing until the kernel picks a victim (raise it if compiles start failing), and the Docker `app` service sets `mem_limit: 2g` so a container is capped instead of the host.

### Manual upload via Supabase Dashboard

1. Storage → bucket `photos` → upload files at paths above.
2. Table Editor → `photos`: set `url` (display public URL), `thumb_url`, `storage_path` to match.
3. Reload app (hydrate pulls remote data).

### Free tier notes

- **1 GB** file storage — target ~400 KB per gallery photo (2 WebP variants).
- **5 GB** egress/month — use thumbnails in grids; `next/image` lazy-loads where enabled.
- Owner-grouped paths make Supabase Storage easier to audit at scale (`tours`/`attractions`/`loose`).
- Legacy `picsum.photos` URLs in `photos.url` are not migrated — re-upload via Gallery UI.

## 9. Supabase CLI migrations

Schema changes use the **Supabase CLI** (`supabase/migrations/`). On **local Docker**, `npx supabase start` applies pending migrations automatically. On **remote**, use `npm run db:push` with `SUPABASE_DB_URL`. SQL Editor path still uses `schema.sql` (keep in sync with migrations).

**Do not** run `db push --local` and expect the customer remote to update — they are separate databases.

### 9a. One-time setup

```bash
npm install                    # installs supabase CLI (devDependency)
```

**Local Docker (dev)** — no cloud project required:

```bash
npx supabase start
# Then put API/anon/service keys + SUPABASE_DB_URL (port 54322) into .env.local
npm run db:push:local          # when you add new migrations later
npm run db:status:local
```

**Self-hosted remote** (e.g. customer `sb.…`) — keep credentials in deploy env or `.env.remote.local`:

```env
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@HOST:5432/postgres
```

**Supabase Cloud** — either set `SUPABASE_DB_URL` as above, or:

```bash
npm run db:login               # opens browser → access token
npm run db:link -- --project-ref YOUR_PROJECT_REF
```

`config.toml` lives at [`supabase/config.toml`](../supabase/config.toml) (created by `supabase init`).

### 9b. Bootstrap existing database

If the **remote** DB already has `schema.sql` applied (no `supabase_migrations.schema_migrations` history) — **do not** `db push` the baseline (tables already exist):

```bash
# Add SUPABASE_DB_URL for the remote first
npm run db:bootstrap           # marks 20260101000000 as applied
npm run db:status              # file vs remote history
```

Manual repair for a single version:

```bash
bash scripts/supabase-db.sh repair-applied 20260101000000
```

### 9c. New migration workflow

```bash
npm run db:migration:new -- add_my_column
# Edit supabase/migrations/<timestamp>_add_my_column.sql
npm run db:push:local          # apply on local Docker first
# After verification:
npm run db:push                # remote — needs SUPABASE_DB_URL
```

Checklist per migration:

1. SQL in `supabase/migrations/` (prefer `IF NOT EXISTS` / idempotent DDL)
2. Mirror DDL into [`supabase/schema.sql`](../supabase/schema.sql) for SQL Editor fresh installs
3. Update app types/mappers in `lib/` if columns changed
4. `npm run typecheck`
5. PROD: backup → `npm run db:push` on production `SUPABASE_DB_URL`

### 9d. npm scripts

| Script | Purpose |
|--------|---------|
| `npm run db:login` | Supabase Cloud access token |
| `npm run db:link` | Link CLI to cloud project ref |
| `npm run db:migration:new -- name` | Create timestamped migration file |
| `npm run db:push:local` | Apply pending migrations to **local** Docker |
| `npm run db:status:local` | List migrations on **local** Docker |
| `npm run db:push` | Apply pending migrations to **remote** (`SUPABASE_DB_URL`) |
| `npm run db:pull` | Pull remote schema into new migration |
| `npm run db:status` | List migration history vs remote |
| `npm run db:bootstrap` | Mark baseline `20260101000000` applied on existing remote DB |

Helper: [`scripts/supabase-db.sh`](../scripts/supabase-db.sh)

### 9e. Squashed legacy patches

Pre-CLI `migrate-*.sql` files were removed; history note: [`supabase/legacy/LEGACY-MIGRATIONS.md`](../supabase/legacy/LEGACY-MIGRATIONS.md). New changes go only in `migrations/`.

### 9f. Common errors

| Error | Fix |
|-------|-----|
| `relation "X" already exists` | Run `npm run db:bootstrap` on existing remote DB before first push |
| `SUPABASE_DB_URL is not set` | Add Postgres URL for **remote** push, or use `db:push:local` for Docker |
| `Cannot find project ref` | Use `db:push` with `SUPABASE_DB_URL`, or `db:link` for Cloud |
| RLS blocks after new table | Update `rls-authenticated.sql` and re-run on remote |
| Access Control API 500 after pull | Migrations not on that DB — local: `db:push:local`; remote: `db:push` |
