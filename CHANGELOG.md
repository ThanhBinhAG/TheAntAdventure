# Changelog

All notable changes to **The Ant Adventures CRM** are documented here.

Format: entries are grouped by date (`YYYY-MM-DD HH:mm` UTC+7) with bullet points per change.

---

## 2026-06-22 15:30 (UTC+7)

### Added — Live duplicate email validation

- [`CustomerFormModal.tsx`](components/customers/CustomerFormModal.tsx) — Debounced on-the-fly email check (400ms) while typing; inline error shows existing customer name/ID; save button disabled when duplicate detected.
- [`lib/customer-onboarding.ts`](lib/customer-onboarding.ts) — `formatDuplicateEmailMessage()`, `isCustomerEmailAvailable()` helpers.
- Tests for new helpers in [`tests/customer-onboarding.test.ts`](tests/customer-onboarding.test.ts).

### Fixed

- Modal no longer closes on failed save — form data is preserved when email is duplicate (modal only closes when `onSave` returns `true`).
- Removed redundant duplicate-email `alert()` from Customers, Sales, and Tour Design pages (inline UI replaces it).

---

## 2026-06-22 14:00 (UTC+7)

### Added — Customer onboarding flow

- **`lib/customer-onboarding.ts`** — Centralized logic for new customer registration:
  - `nextCustomerId()` generates IDs in `CUS-{YY}-{NNN}` format (aligned with Supabase schema and seed data).
  - `resolveAgentId()` maps B2B agent name / datalist labels to `agents.id` foreign key.
  - `findDuplicateCustomerByEmail()` blocks duplicate email on create and edit.
  - `registerNewCustomer()` creates customer + auto **Lead** (stage `Inquiry`) + optional **Comm** (inbound inquiry log).
- **`hooks/useRegisterCustomer.ts`** — Shared hook wiring store actions (`addCustomer`, `addLead`, `addComm`, `updateCustomer`).
- **Customer form** — Checkbox “Log initial inquiry” on add mode ([`CustomerFormModal.tsx`](components/customers/CustomerFormModal.tsx)).
- **Entry points** — “+ New Client” on [`Sales.tsx`](components/pages/Sales.tsx); “+ New” beside customer dropdown on [`TourDesign.tsx`](components/pages/TourDesign.tsx).
- **Tests** — [`tests/customer-onboarding.test.ts`](tests/customer-onboarding.test.ts) (17 cases: ID generation, duplicate detection, agent FK, lead/comm creation).
- **`npm test`** script added to [`package.json`](package.json) (Node test runner via `tsx`).

### Changed

- [`lib/customer-form.ts`](lib/customer-form.ts) — `formToCustomer()` accepts optional `agentId`; `nextCustomerId` re-exported from onboarding module.
- [`components/pages/Customers.tsx`](components/pages/Customers.tsx) — Save handler uses `useRegisterCustomer`; shows success message with customer ID and lead ID.

### Fixed

- New customer IDs no longer use legacy `CU-NNN` prefix (inconsistent with `CUS-26-xxx` in database and seeds).

---

## Prior releases

See [`Personal/CRM-KIEM-TRA-VA-CO-SO-DU-LIEU.md`](Personal/CRM-KIEM-TRA-VA-CO-SO-DU-LIEU.md) for migration history from HTML v4.3 → Next.js + Supabase v5.0 (checked 2026-06-21).
