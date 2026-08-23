# Bao cao review migration Dev A - 2026-08-21

> Day la file bao cao hop nhat cho Dev A. No thay the cac bao cao acceptance, E2E va build/leakage rieng le. `SESSION-AVAILABILITY.md` van duoc giu rieng vi la tai lieu quyet dinh van hanh cho Owner-Ops.

## 1. Ket luan hien tai

Dev A da hoan thanh luong moi cho pham vi A0-A5: browser dung BFF cho cac thao tac nghiep vu, mutation di qua server, Product/Attraction/Tour Design co transaction PostgreSQL, va session CRM co persistent store PostgreSQL de Redis-down khong lam mat dang nhap.

Tuy nhien, **chua du dieu kien dong migration/A6**. Hai gate he thong van fail do cac dependency dung chung chua migration:

| Pham vi | Trang thai | Y nghia |
|---|---|---|
| Feature API va mutation Dev A (A0-A5) | Pass acceptance | Code va test da chung minh cac luong nghiep vu chinh hoat dong dung. |
| Transaction va availability Dev A | Pass acceptance | Import/aggregate rollback; Redis khong con la session store bat buoc. |
| Browser "CRM origin only" | Fail | Cac man Dev A van keo legacy hydrate dung chung, nen browser goi Supabase truc tiep. |
| Production leakage gate | Fail | Bundle browser con Supabase URL, publishable key va `createBrowserClient`. |
| A6 final cutover | Chua bat dau | Chi lam sau khi Dev B/shared va Owner-Ops hoan tat phan phu thuoc. |

Khong con finding Critical dang mo trong pham vi mutation/session Dev A. Hai finding High dang mo la gate cutover chung, khong phai viec sua nghiep vu doc lap cua Dev A.

## 2. Doi chieu ke hoach va phan da lam

| Task | Muc tieu luong moi | Da thuc hien | Trang thai |
|---|---|---|---|
| A0 Auth & Session | Cookie CRM HttpOnly, server xac thuc session; browser khong dung Supabase token | Login/logout, middleware va permission dung CRM session; session duoc ma hoa va luu PostgreSQL; Redis chi la tombstone revoke tuy chon | Hoan thanh |
| A0.1 BFF primitives | UI chi goi CRM API, server xu ly auth/validation/RLS | Server Supabase client, Zod validation, permission boundary va API route pattern | Hoan thanh |
| A1 Product cache | Cache-aside, TTL/invalidation, Redis-down fallback | Product list/facet cache TTL 60 giay; invalidate sau mutation/import; fallback Supabase khi Redis loi | Hoan thanh |
| A2 Tour Product/Pricing | Product/Pricing read-write qua BFF, import atomic | Repository/API BFF; import dung `replace_product_catalogue`; create/update dung aggregate RPC | Hoan thanh |
| A3 Daily Planner | CRUD qua BFF, state chi cap nhat sau response thanh cong | Planner API/repository/UI va validation/failure coverage | Hoan thanh |
| A4 Attraction Schedule | Read/filter va mutation qua BFF, aggregate atomic | Attraction API/repository/UI; filter region chi tai photo link cua Attraction da loc; aggregate RPC | Hoan thanh |
| A5 Tour Design | Draft/outline luu all-or-nothing | Save RPC transaction; UI giu draft khi save that bai | Hoan thanh |
| A6 Final public-Supabase cutover | Khong con browser Supabase/public config | Chua lam theo dung thu tu; dang cho dependency migration va ha tang private | Chua bat dau |

## 3. Cac bang chung theo commit

| Commit | Noi dung | Gia tri voi luong moi |
|---|---|---|
| `98bd0f7` | BFF wrapper, validation, server Supabase client | Dat ranh gioi server cho API CRM. |
| `0551f3b` | Redis helper | Nen cho cache-aside co fallback. |
| `e404077` | Product/Pricing BFF va UI | Dua Product/Pricing vao API CRM. |
| `81a2b36` | Planner BFF va UI | Dua Daily Planner vao API CRM. |
| `434e9de` | Attractions, Tour Design BFF | Dua hai feature nay vao BFF. |
| `fa75f51`, `72433bb` | CRM session, middleware, expiry test | Tach session CRM khoi Supabase cookie browser. |
| `ef7689a`, `77430a4`, `5539d1a` | Bo browser push/read cu cua Dev A, cache va leakage gate | Zustand chi con la UI cache; Dev A tables khong auto-sync len Supabase. |
| `ee342e4` | Tour Design save transaction | Tranh draft/outline nua voi. |
| `f09076b` | Product import transaction | Import loi khong xoa/nua voi catalogue cu. |
| `feb8066` | Product/Attraction aggregate transaction va durable session | Dong product/pricing/photo, attraction/photo va Redis-down session gap. |

Khoang baseline ban dau la `f230535..5539d1a`; cac commit sau ngay 2026-08-21 bo sung cac finding ma review ban dau da phat hien. Vi vay khong nen dung bao cao cu de ket luan CRIT-01, HIGH-01 hay HIGH-02 con mo.

## 4. Giai thich cac phan Dev A da bo sung

### Session CRM va Redis-down

- Cookie `crm_session` chi mang dinh danh session opaque; browser khong can doc Supabase access token.
- `lib/auth/crm-session-store.ts` dung PostgreSQL server-only lam source of truth va ma hoa payload AES-GCM.
- Redis chi giu revoke tombstone de tang toc. Redis loi van cho login, validate session da co, logout va revoke theo PostgreSQL.
- Migration can co o moi moi truong: `20260821113000_add_durable_crm_sessions.sql`; `SUPABASE_SERVICE_ROLE_KEY` va `CRM_SESSION_SECRET` la bat buoc cho durable session.

### Product, Pricing va cache

- List/filter/pagination va facets dung `/api/products` va `/api/products/facets`, khong hydrate Product/Pricing vao browser.
- Cache Product la cache-aside 60 giay; cache miss, entry hong hoac Redis-down thi repository doc Supabase binh thuong.
- `replace_product_catalogue` validate payload, thay catalogue va Pricing stub trong mot transaction. Loi o bat ky buoc nao deu rollback catalogue cu.
- Product create/update va Pricing/photo link cung dung aggregate RPC, khong ghi bang theo chuoi statement tach roi.

### Planner, Attractions va Tour Design

- Planner CRUD va validation di qua endpoint BFF; UI cap nhat store sau response thanh cong.
- Attraction create/update cung dung aggregate transaction. Read theo region chi query photo links cua nhung Attraction da duoc loc.
- Tour Design upsert draft, thay outline va validate duplicate day trong mot PostgreSQL RPC. Khi save loi, UI giu du lieu nhap va database giu aggregate cu.

## 5. Ket qua kiem thu da chay

| Gate | Ket qua | Ghi chu |
|---|---|---|
| `npm run lint` | Pass | Khong co error/warning. |
| `npm run typecheck` | Pass | Khong co TypeScript error. |
| `npm test` | Pass | 96 pass, 0 fail, 5 skip integration opt-in. Log loi BFF/Redis trong negative test la co chu dich. |
| PostgreSQL session integration | Pass | Tat Redis va xac nhan session doc/revoke duoc tu PostgreSQL that. |
| Browser BFF acceptance | Pass | 7 scenario dung browser that va database assertion that. |
| Chromium dependency | Pass | `@sparticuz/chromium@149.0.0` hop le; Next da compile production. |
| Browser CRM-origin audit | Fail | Ca 4 man Dev A co request Supabase truc tiep. |
| `npm run build` | Fail gate | Compile thanh cong, nhung `npm run leakage:check` fail sau build. |

Browser acceptance da cover: login/logout, expiry/revoke, `401`/`403`, Product CRUD/Pricing/import-fail, Planner CRUD/validation, Attraction region/filter/mutation-fail, va Tour Design rollback.

## 6. Hai finding con mo va owner phu hop

### HIGH-01: Browser van goi Supabase truc tiep

`e2e/network-origin.spec.ts` fail tren `/products`, `/planner`, `/attractions` va `/tourdesign`, ghi nhan origin Supabase local. Nguyen nhan la `PageDataGate` va `lib/db/hydrate` dung chung van khoi tao du lieu legacy bang browser Supabase client. Tour Design con phu thuoc Customer, Lead, Communication va Hotel; day la feature dependency cua Dev B.

- **Tac dong:** Feature mutation Dev A dung BFF, nhung ca man chua dat tieu chi browser chi goi CRM origin.
- **Owner chinh:** Dev B/nhom shared migration cho Customer, Lead, Communication, Hotel, Photo Gallery va boot data con lai.
- **Hanh dong sau do:** go `PageDataGate`, legacy hydrate va browser Supabase client khi co BFF thay the; rerun E2E network audit den khi khong con origin ngoai CRM.

### HIGH-02: Browser bundle con leakage Supabase

Production build sinh bundle thanh cong, nhung scanner tim thay Supabase URL, publishable key va `createBrowserClient` trong bundle. Day la he qua truc tiep cua HIGH-01 va cac feature ngoai scope Dev A con can browser Supabase.

- **Khong sua bang cach tat scan hoac xoa env som:** se lam legacy feature loi va che giau finding that.
- **Owner phoi hop:** Dev B/nhom shared go consumer; Owner-Ops ban giao topology private (khong public Supabase/Redis/Postgres) va rotate publishable key sau cutover.
- **Dieu kien dat:** `npm run build` pass ca leakage check va network audit tra ve object rong.

## 7. Viec Dev A con can lam va viec khong nen tu lam

| Uu tien | Viec | Owner | Dieu kien xong |
|---|---|---|---|
| P0 | Ho tro Dev B trace dependency boot data tren cac man Dev A | Dev A + Dev B | Moi dependency co endpoint BFF hoac duoc tach khoi page boot. |
| P1 | Chay lai acceptance sau merge shared migration | Dev A | E2E business, network audit, lint, typecheck, test va build deu pass. |
| P1 | Xac nhan migration durable session/import/aggregate da apply vao database muc tieu | Dev A + Owner-Ops | RPC/table ton tai, service role va secret duoc cau hinh. |
| P1 | Ban giao private topology va rotate key sau cutover | Owner-Ops | Khong con public Supabase config trong browser bundle. |
| P2 | A6 final cleanup | Nhom | Chi bat dau khi tat ca feature scope pass hai gate tren. |

Dev A **khong nen** tu xoa `NEXT_PUBLIC_SUPABASE_*`, `lib/supabase/client.ts`, `PageDataGate` hoac shared hydrate ngay luc nay: cac feature Dev B chua migration se bi gay. Day la ly do A6 duoc de sau.

## 8. Cach chay va doc acceptance

```bash
npm run lint
npm run typecheck
npm test
CRM_SESSION_POSTGRES_INTEGRATION=1 node --experimental-test-module-mocks --import tsx --test tests/crm-session-postgres.integration.test.ts
E2E_ALLOW_DATABASE_MUTATION=1 npm run test:e2e
npm run build
```

E2E can Redis, Supabase local, migration hien tai va `.env.local` co local Supabase URL, anon key, service-role key, `CRM_SESSION_SECRET`. Test tu choi database remote mac dinh; tuyet doi khong dat `E2E_ALLOW_DATABASE_MUTATION=1` cho production.

Kiem tra thu cong gate con mo:

1. Mo DevTools Network, bat `Preserve log`, loc `Fetch/XHR`.
2. Login va mo lan luot Tour Products, Daily Planner, Attraction Schedule, Tour Design.
3. Ket qua dat chi co request cung CRM origin, vi du `/api/...`; khong co Supabase host, `/rest/v1`, `/auth/v1`, `/storage/v1` hoac Realtime WebSocket.
4. Hien tai buoc 3 se that bai dung nhu E2E da bao cao; dung no lam evidence khi phoi hop Dev B/shared.

## 9. Thu tu doc code de review lai

1. Doc `docs/BFF-TASKS.md` va `docs/BFF-TASKS-vi.md` de nam scope va acceptance criteria.
2. Xem nen tang: `git show 98bd0f7 -- lib/bff lib/auth lib/supabase`.
3. Xem Product/Pricing: `git show e404077 f09076b feb8066 -- app/api/products lib/products supabase/migrations`.
4. Xem Planner: `git show 81a2b36 -- app/api/planner lib/planner components/pages/Planner.tsx`.
5. Xem Attractions/Tour Design: `git show 434e9de ee342e4 feb8066 -- app/api/attractions app/api/tour-design lib/attractions lib/tour-design supabase/migrations`.
6. Xem session: `git show fa75f51 72433bb feb8066 -- app/api/auth lib/auth tests/crm-session*`.
7. Xem cutover va evidence: `git show ef7689a 77430a4 5539d1a -- lib/db components tests` va doc `e2e/` cung `scripts/scan-leakage.sh`.

## 10. Ket luan de bao cao truong nhom

Dev A da chuyen cac feature duoc giao sang luong BFF moi va da dong cac loi atomicity/session availability da phat hien trong review dau tien. Cac unit, integration va browser business scenario deu pass. Cong viec chua dong la final system cutover, bi chan boi browser Supabase dependency dung chung cua Dev B va handoff ha tang private/rotate key cua Owner-Ops. De tranh gay feature chua migration, Dev A can giu legacy shared layer cho den khi cac dependency co BFF thay the, sau do chay lai hai gate network-origin va production leakage truoc A6.
