# GraphRAG Memory — The Ant Adventures CRM

> Snapshot: 2026-07-30 · phạm vi: mã nguồn đang có trong repository, không bao gồm `node_modules` hay `.next`.
>
> Mục đích: đây là memory map để truy vết nhanh **chức năng → file → dữ liệu → luồng chạy**. Các sơ đồ là các cạnh có hướng; tên trong dấu backtick là node có thể tìm bằng `rg`.

## 1. Retrieval index

| Muốn tìm | Bắt đầu từ | Theo cạnh tới |
|---|---|---|
| Điều hướng/trang CRM | `lib/constants.ts` (`NAV_SECTIONS`, `VALID_PAGES`) | `app/(crm)/[page]/page.tsx` → `components/pages/index.ts` → page component |
| Dữ liệu CRM | `lib/store.ts`, `lib/types.ts` | `components/StoreProvider.tsx` → `lib/db/hydrate.ts` / `lib/db/sync-push.ts` → `lib/db/supabase.ts` |
| Supabase/schema & RLS | `supabase/schema.sql`, `supabase/migrations/20260730042242_02_migrations.sql`, `docs/DATABASE.md` | table → mapper trong `lib/db/mappers.ts` → `lib/db/supabase.ts`; RLS chuyển tiếp ở `supabase/rls-authenticated.sql` |
| Đăng nhập/session | `app/api/auth/login/route.ts` | `lib/auth/*`, `lib/env.ts`, `middleware.ts` |
| Sales đến booking | `components/pages/Sales.tsx` | `lib/customers/*`, `lib/sales/*`, `components/pages/Bookings.tsx` |
| Thiết kế tour/proposal | `components/pages/TourDesign.tsx` | `components/tour-design/*` → `lib/tour-design/*` / `lib/proposals/*` |
| Bảng giá/XLSX | `components/pages/Pricing*.tsx` | `components/pricing/*` → `lib/pricing/*` → bảng `pricing_*` |
| Ảnh | `components/pages/Gallery.tsx` | `components/gallery/*` → `lib/gallery/*` / `lib/storage/*` → Storage `photos` |
| API server | `app/api/**/route.ts` | `lib/auth`, `lib/weather`, `lib/storage`, `lib/system`, `lib/proposals` |
| Kiểm thử | `tests/*.test.ts` | module `lib/` cùng tên; test runner là `npm test` (hai test XLSX cần workbook gitignored trong `Personal/Material/pricing/`) |

## 2. System graph

```mermaid
flowchart LR
  U[Nhân viên / Browser] --> N[Next.js 14 App Router]
  N --> L[Root layout]
  L --> R[/(crm)/[page] dynamic route]
  R --> C[CRM client shell]
  C --> P[components/pages]
  C --> Z[Zustand: lib/store.ts]
  P --> Z
  C --> S[StoreProvider + AutoSyncListener]
  S --> H[Hydrate: lib/db/hydrate.ts]
  H --> HL[Hydration lifecycle + baseline counts]
  S --> A[Auto-sync: lib/db/auto-sync.ts]
  HL --> A
  H --> D[lib/db/supabase.ts]
  A --> D
  D --> SB[(Supabase PostgreSQL + Storage)]
  N --> API[app/api/* route handlers]
  API --> SB
  API --> EXT[Open-Meteo / Puppeteer PDF / Sentry]
  U --> LOGIN[/login]
  LOGIN --> AUTH[/api/auth/login]
  AUTH --> SA[Supabase Auth + break-glass]
```

### Trust boundaries

```mermaid
flowchart TB
  subgraph Browser[Không tin cậy: browser]
    UI[UI + Zustand snapshot]
    ANON[Public Supabase URL + anon key]
  end
  subgraph Next[Server boundary: Next.js]
    AR[API routes]
    SR[SUPABASE_SERVICE_ROLE_KEY]
    BG[Break-glass cookie/session]
  end
  subgraph Supabase[Data boundary]
    AU[Supabase Auth]
    DB[(PostgreSQL RLS)]
    ST[Storage photos]
  end
  UI --> ANON --> DB
  UI --> AR --> SR --> DB
  UI --> AR --> SR --> ST
  BG --> AR
  AU --> DB
```

## 3. Route and UI graph

```mermaid
flowchart TB
  ROOT[/] --> DASH[/dashboard]
  CRM[app/(crm)/layout.tsx] --> SHELL[Sidebar + Topbar + StoreProvider + AI Copilot]
  DYN[app/(crm)/[page]/page.tsx] --> REG[PAGE_COMPONENTS]

  REG --> S1[Sales & Product]
  S1 --> dashboard
  S1 --> planner
  S1 --> customers
  S1 --> agents
  S1 --> sales
  S1 --> tourdesign
  S1 --> products
  S1 --> gallery
  S1 --> pricing
  S1 --> pricing_essentials[pricing-essentials]
  S1 --> pricing_accommodation[pricing-accommodation]
  S1 --> weather
  S1 --> attractions

  REG --> S2[Operations]
  S2 --> bookings
  S2 --> contracts
  S2 --> suppliers
  S2 --> guides
  S2 --> posttour

  REG --> S3[Finance]
  S3 --> finance
  S3 --> tax
  S3 --> salary

  REG --> S4[Company Portal]
  S4 --> about
  S4 --> culture
  S4 --> regulations
  S4 --> hr
  S4 --> ai
  S4 --> devnotes
  S4 --> teamchat
```

Page registry: `components/pages/index.ts` lazy-loads every page except `Dashboard`. `lib/constants.ts` is the authoritative navigation and slug registry; `lib/types.ts` supplies `PageSlug`.

## 4. Domain graph

```mermaid
flowchart LR
  subgraph CustomerSales[Khách hàng & sales]
    CUS[customers] --> LEAD[leads]
    LEAD --> TD[tour_drafts / tour_outline_days]
    LEAD --> BOOK[bookings]
    CUS --> COMMS[comms]
    AG[agents] --> CUS
  end

  subgraph Operations[Vận hành tour]
    BOOK --> ITIN[booking_itinerary]
    ITIN --> ACT[booking_activities]
    BOOK --> CONT[contracts]
    BOOK --> FIN[finance]
    BOOK --> FB[feedback]
    GUIDE[guides] --> CAL[cal_events]
    SUP[suppliers] --> HOTEL[hotels / hotel_rooms]
    SUP --> TRAN[transport / restaurants / cruises]
  end

  subgraph Catalogue[Catalogue, pricing & media]
    PROD[products] --> PPRICE[product_pricing]
    PROD --> PPHOTO[product_photos]
    PHOTO[photos] --> PPHOTO
    PHOTO --> ATTPHOTO[attraction_photos]
    ATT[attractions] --> ATTPHOTO
    PRICE[pricing_* catalogue tables]
  end

  subgraph Team[Team & support]
    STAFF[staff] --> SAL[salary_records]
    TASK[tasks]
    CHAT[chat_channels] --> MSG[chat_messages] --> REACT[chat_reactions]
    DEV[dev_notes]
  end

  subgraph Frontend[UI and domain modules]
    CP[components/pages + widgets]
    LCS[lib/customers + lib/sales]
    LTD[lib/tour-design + lib/proposals]
    LOP[lib/products + lib/pricing]
    LOS[lib/suppliers + lib/planner + lib/contracts]
    CP --> LCS
    CP --> LTD
    CP --> LOP
    CP --> LOS
  end

  LCS --> CUS
  LTD --> TD
  LTD --> BOOK
  LOP --> PROD
  LOP --> PRICE
  LOS --> SUP
  LOS --> TASK
```

### Domain node catalogue

| Area | UI nodes | Logic/data nodes | Primary persistence |
|---|---|---|---|
| CRM shell | `Sidebar`, `Topbar`, `StoreProvider`, `AutoSyncListener` | `store.ts`, `constants.ts`, `types.ts`, `context/` | all synchronised tables |
| Customers & B2B | `pages/Customers`, `pages/Agents`, `components/customers`, `components/agents` | `customers/`, `sales/agents-commission.ts` | `customers`, `agents`, `comms`, `leads` |
| Sales | `pages/Sales` | `sales/sales-lead-utils.ts`, `sales/booking-from-lead.ts` | `leads`, `bookings` |
| Tour Design | `pages/TourDesign`, `components/tour-design/*` | `tour-design/*`, `proposals/*` | `tour_drafts`, `tour_outline_days`, products/pricing |
| Product & Gallery | `pages/Products`, `pages/Gallery`, `components/products`, `components/gallery` | `products/*`, `gallery/*`, `storage/*` | `products`, `product_pricing`, `photos`, Storage |
| Pricing | `pages/Pricing*`, `components/pricing/*` | `pricing/*` | `pricing_*` tables; selected legacy product prices |
| Operations | `pages/Bookings`, `Contracts`, `Suppliers`, `Guides`, `PostTour`, `Planner` | `contracts/`, `suppliers/`, `planner/` | booking, supplier, guide, contract, feedback, task tables |
| Finance & HR | `pages/Finance`, `Tax`, `Salary`, `HR` | shared store/mappers | finance, AR/AP, tax, staff, salary tables |
| Information | `About`, `Culture`, `Regulations`, `AI`, `DevNotes`, `TeamChat`, `Weather`, `Attractions` | `weather/*`, `attractions/*`, `system/*`, `i18n/*` | notes/chat/weather cache/attractions |

## 5. Execution-flow graph

### Login and session

```mermaid
sequenceDiagram
  participant B as Browser
  participant L as /login
  participant A as /api/auth/login
  participant SA as Supabase Auth
  participant BG as Break-glass
  B->>L: email/password (+ optional CAPTCHA)
  L->>A: POST credentials
  alt break-glass credentials
    A->>BG: sign bg_session cookie
    A->>SA: optionally attach shadow session
  else standard account
    A->>SA: signInWithPassword
    SA-->>A: auth cookies
  end
  A-->>B: session cookies
  B->>CRM: navigate to protected CRM route
```

Implemented session bridge: `middleware.ts` calls `updateSession` from `lib/supabase/middleware.ts`; `lib/supabase/index.ts` caches the browser client created by `lib/supabase/client.ts`. Middleware keeps `/api/health`, login/logout and configured debug paths public, refreshes Supabase cookies, and redirects unauthenticated CRM traffic to `/login`. Break-glass sessions can also attach a shadow Supabase session for authenticated RLS access.

### Hydrate and synchronization

```mermaid
sequenceDiagram
  participant SP as StoreProvider
  participant HY as hydrateFromSupabase
  participant DB as lib/db/supabase
  participant SB as Supabase
  participant Z as Zustand store
  participant HL as sync-lifecycle
  participant AS as AutoSyncListener
  SP->>HY: app start
  HY->>DB: getAll for 28 sync tables + messages
  DB->>SB: browser Supabase queries
  SB-->>HY: rows
  HY->>Z: importBackup + seed merges (auto-sync suppressed)
  HY->>HL: mark ready + baseline row counts
  Z-->>AS: subsequent state mutation
  AS->>AS: debounce 2.5 seconds
  AS->>DB: upsert changed table(s)
  DB->>SB: upsert + guarded mirror deletion
```

Important implementation nodes:

- `lib/db/sync-config.ts` maps 28 table names to `BackupData`/Zustand keys and declares FK-safe write waves.
- `lib/db/mappers.ts` transforms domain models ↔ SQL rows.
- `lib/db/sync-lifecycle.ts` blocks automatic writes until a successful hydrate records baseline counts; a failed hydrate permits only an explicitly confirmed manual push.
- `lib/db/sync-policy.ts` makes `products` and `product_pricing` upsert-only. Other synchronized tables skip orphan deletion when the local row count is below 90% of the hydrated baseline; `force` can bypass that guard for mirror tables.
- `lib/db/supabase.ts` still reads and writes many full tables (`select('*')`) and can delete remote IDs absent from a local snapshot when the guard permits it. Nested booking, hotel, product and attraction associations are replaced per parent during sync.

### Sales to proposal to booking

```mermaid
flowchart LR
  CF[Customer form] --> C[customers]
  CF --> L[Inquiry lead]
  L --> SP[Sales pipeline stages]
  SP --> TD[Tour Design draft]
  TD --> OUT[Outline approval gate]
  OUT --> EXP[Selected experiences + pricing]
  EXP --> PD[Proposal document / PDF]
  SP -->|Confirmed| BK[Booking]
  BK --> IT[Itinerary + activities]
  BK --> FN[Finance / AR / AP / contract / feedback]
```

### Photo and weather server paths

```mermaid
flowchart LR
  G[Gallery UI] --> PU[/api/photos/upload]
  G --> PD[/api/photos/delete]
  PU --> PS[lib/storage/upload-gallery-photo-server]
  PD --> PS
  PS --> ST[Supabase Storage photos bucket]
  PS --> PT[photos + photo_tags]

  W[Weather UI] --> WR[/api/weather/refresh]
  WR --> WA[lib/weather/auth]
  WA --> OF[Open-Meteo]
  OF --> WC[weather_* cache tables]
  W --> WW[/api/weather/weekly]
  WW --> WC
```

## 6. API graph and guards in the current source

| Route | Consumer / purpose | Current guard | Dependency |
|---|---|---|---|
| `POST /api/auth/login` | login form | rate limit; public by design | Supabase Auth / break-glass |
| `POST /api/auth/logout` | Topbar | no explicit route check | Supabase Auth |
| `GET,POST /api/auth/users` | recovery/admin use | `requireBreakGlass` | service-role Auth admin |
| `GET /api/health` | external monitor | public by design | Supabase Auth health |
| `POST /api/photos/upload`, `/delete` | gallery | authenticated only | Storage + `photos` tables |
| `POST /api/pricing/export`, `/api/proposals/export` | pricing/tour-design | authenticated only via `proposal-auth` | Puppeteer/Chromium PDF |
| `GET,PUT /api/system/*` | debug panel | debug token except debug-log POST | diagnostics/log buffer |
| `POST /api/weather/refresh` | weather page or cron | authenticated user or cron secret | service-role cache + Open-Meteo |
| `GET /api/weather/weekly` | weather page | no explicit guard | service-role cache |

## 7. Data graph and sensitivity groups

```mermaid
flowchart TB
  PII[PII: customers, leads, comms, guides, staff] --> CRM[CRM operational data]
  MONEY[Restricted finance: finance, AR/AP, tax, salary, pricing costs] --> CRM
  OPS[Operations: bookings, contracts, suppliers, tasks, feedback] --> CRM
  CAT[Shared catalogue: products, attractions, public-ready photos] --> CRM
  INTERNAL[Internal: dev_notes, chat, audit trail] --> CRM
  CRM --> RLS[Supabase RLS policy]
  RLS --> AUTH[Current transition: shared authenticated access]
  RLS --> ROLE[Target: role + ownership/assignment]
```

Schema relationships live in `docs/DATABASE.md` and `supabase/schema.sql`; the CLI baseline is `supabase/migrations/20260730042242_02_migrations.sql`. Fresh schema/migration sources still create `dev_allow_all` policies. The tracked `supabase/rls-authenticated.sql` is a manual transition run after Auth login works: it replaces those policies with shared `authenticated_access` policies. It blocks anonymous direct access but does **not** implement the role/ownership model below; whether it has been applied to a remote project must be checked separately.

## 8. RBAC target graph and implementation blueprint

### Recommended role set

Use roles as a coarse grant and permissions as the stable implementation primitive. Do not encode page names directly in Supabase Auth metadata as the only authority.

| Role | Scope | Typical rights |
|---|---|---|
| `super_admin` | emergency/system administration | all permissions; break-glass only for recovery |
| `admin` | business administration | user/role management, all business modules, no break-glass secret actions |
| `sales_manager` | sales team | see team pipeline; assign leads; approve discounts/exports |
| `sales_agent` | assigned customers/leads | CRUD own/assigned customer, lead, draft; no finance/HR |
| `operations` | confirmed tours | booking, itinerary, suppliers, guides, tasks; limited customer read |
| `finance` | finance | finance, AR/AP, tax, pricing cost; booking/customer read; no HR salary by default |
| `hr` | people operations | staff, salary, selected company pages; no customer finance |
| `content_editor` | catalogue/media | products, attractions, gallery; no customer/finance data |
| `viewer` | read-only reporting | approved read-only data, no export of sensitive data |

### Permission vocabulary

```mermaid
flowchart LR
  USER[auth.users user_id] --> PROFILE[profiles]
  PROFILE --> UR[user_roles]
  UR --> ROLE[roles]
  ROLE --> RP[role_permissions]
  RP --> PERM[permissions: resource.action]
  PROFILE --> ASSIGN[ownership / assignment]
  PERM --> RLS[Postgres RLS]
  PERM --> API[Next API guard]
  PERM --> UI[Navigation + control visibility]
  ASSIGN --> RLS
```

Suggested resources/actions: `customers.{read,create,update,delete}`, `leads.*`, `tour_drafts.*`, `bookings.*`, `products.*`, `pricing.{read,write,export}`, `finance.*`, `hr.*`, `photos.*`, `weather.{read,refresh}`, `users.manage`, `audit.read`. Add `own`, `team`, and `all` as scope levels only where row ownership is meaningful.

### Policy boundaries by data class

| Data group | RLS rule shape | Role examples |
|---|---|---|
| Customer, lead, comms, tour draft | `owner_user_id = auth.uid()` or active assignment membership; managers see team | sales agent / sales manager |
| Booking, itinerary, supplier, guide, task | booking assignment/team membership | operations / manager |
| Finance, AR/AP, tax, salary | permission check only; no open ownership fallback | finance / HR / admin |
| Products, attractions, pricing | shared read; write requires content/pricing permission | content editor / finance / admin |
| Photos / Storage | owner folder and application permission; never arbitrary path parameter | content editor / admin |
| Chat, dev notes | channel membership / author / explicit admin | internal roles |

### Ordered delivery plan

1. **Verify and ship the current baseline.** Browser/session helpers, DnD dependencies and Sentry are tracked, and local typecheck, lint and production build pass. Make the XLSX parser tests portable (fixture or explicit optional test input), then verify that the remote database has run the tracked authenticated-only RLS transition before adding RBAC.
2. **Define the authorization contract.** Confirm the above role matrix with business owners; write a permission list, sensitive-data classification, team/manager model and export policy. Decide whether agents own records directly or via a team table.
3. **Model authorization in a versioned SQL migration.** Add `profiles`, `roles`, `permissions`, `user_roles`, and (where needed) assignment/team tables. Link profile `id` to `auth.users(id)`; seed only explicit initial roles. Store migrations in version control, not only in a dashboard.
4. **Replace transition RLS with RBAC RLS.** Supersede `dev_allow_all`/shared `authenticated_access` with small SQL helper functions such as `has_permission(resource, action)` and assignment predicates. Write policies table-by-table, beginning with PII/finance. Test each policy with at least two non-admin users and a service-role-only migration path.
5. **Change write architecture before enabling multi-user sync.** The 90% regression guard reduces accidental destructive pushes but does not solve concurrent editing. Replace whole-table mirror/delete synchronization with record-level commands or server-side transactional mutations. Add `owner_user_id`, `created_by`, `updated_by`, `updated_at`, and optimistic versioning to mutable business records.
6. **Enforce on every server path.** The current routes consistently establish authentication where required, but only the recovery API is role-specific. Add a single server authorization helper (`requirePermission`) to distinguish read from export, write, delete, refresh and user administration. Service-role clients must run only after this check and must not accept unvalidated storage paths.
7. **Use permissions in UI as affordances only.** Populate session/profile permissions; filter `NAV_SECTIONS`, hide write/delete controls and protect actions. The UI never substitutes for RLS/API enforcement.
8. **Add audit and tests.** Log role changes, exports, deletes, rejected access and break-glass use. Add unit tests for the permission matrix plus integration tests that execute RLS as each role. CI already runs lint and production build; add typecheck and a self-contained test suite.
9. **Roll out safely.** Start in read-only mode for a small pilot, compare count/access logs, then enable writes by role. Keep a tested rollback migration and emergency `super_admin` procedure.

## 9. Known integrity and delivery constraints at this snapshot

| Priority | Evidence node | Why it matters to the graph/RBAC plan |
|---|---|---|
| Critical | `supabase/schema.sql:1068-1095` and `supabase/migrations/20260730042242_02_migrations.sql` | Both fresh-install sources grant anonymous `dev_allow_all` access. `rls-authenticated.sql` is tracked but is a manual, shared-access transition, so its remote application must be verified. |
| High | `lib/db/supabase.ts`, `lib/db/sync-policy.ts`, `lib/db/sync-lifecycle.ts` | Snapshot mirror sync still deletes remote rows when the 90% baseline guard permits it or an operator forces a push; this conflicts with concurrent editing and future row-scoped RLS. |
| High | `app/api/photos/delete/route.ts` → `lib/storage/upload-gallery-photo-server.ts` → `lib/storage/photo-paths.ts` | Any authenticated user can invoke a service-role-capable delete and provide an additional `storagePath`; folder policy and validation are not a per-record authorization check. |
| High | `scripts/supabase-db.sh`, `supabase/LEGACY-MIGRATIONS.md` | Bootstrap guidance still names three migration files deleted in the current revision, while the only tracked CLI migration is `20260730042242_02_migrations.sql`; reconcile migration history before relying on CLI status/push. |
| Medium | `.gitlab-ci.yml` | CI runs lint and production build, but not typecheck or tests. |
| Medium | `tests/pricing-catalog-xlsx.test.ts:8-9` | Two tests depend on XLSX files below gitignored `Personal/Material/pricing/`, so a checkout without local material reports two `ENOENT` failures. |
| Medium | `components/pages/Sales.tsx` (882 lines), `TourDesign.tsx` (778), `Bookings.tsx` (694), `Dashboard.tsx` (690), `lib/db/supabase.ts` (821), `lib/proposals/proposal-assembler.ts` (943) | High coupling makes permission checks and future ownership enforcement expensive; extract command/data boundaries before broad RBAC UI work. |

## 10. Verification status

- Static source review: complete for App Router, page registry, core state/sync, auth/session, API handlers, storage, weather, database schema, tests and project configuration.
- `npm run typecheck`: passed.
- `npm run lint`: passed with `--max-warnings=0`.
- `npm run build`: passed. Sentry reports a deprecation warning that `sentry.client.config.ts` should move to `instrumentation-client.ts` for future Turbopack support.
- `npm test`: 264 of 266 tests passed. The two failures are `ENOENT` reads for the ignored Essentials and Accommodation XLSX workbooks; no test assertion failed.
- No source code, configuration or schema was changed to produce this memory document.
