# Implementation Plan: Fazal Hardware (Electron Rebuild)

Source spec: [docs/Fazal_Hardware_PRD.md](Fazal_Hardware_PRD.md) — all section references below point there.

## Overview

Rebuild Fazal Hardware as an offline-first Electron desktop app: React 18 + Vite renderer, SQLite (better-sqlite3, hand-written SQL migrations — kept from the existing toolchain rather than adopting Prisma/Drizzle), local bcrypt auth, Gemini-powered invoice scanning. The repo has just been reset to a clean boilerplate (Phase 0 below) after the prior implementation was built against an older, different PRD (cloud sync to Hostinger, Zustand, partial Products module only). Everything from here is a fresh build against the new spec.

## Architecture Decisions

- **DB access:** keep `better-sqlite3` + numbered `.sql` files in `electron/db/migrations/`, applied by the existing `runMigrations()` in [electron/db/index.ts](../electron/db/index.ts) (confirmed working via `npx tsc --noEmit` / `npm test` / `npx vite build` after the reset). No ORM — matches the user's explicit choice over the PRD's Prisma/Drizzle suggestion.
- **IPC contract:** one `window.api.<domain>.<verb>` namespace per module (pattern already established in the deleted preload — re-created module by module as each phase lands), returning `Result<T>` (`shared/types`).
- **State/data fetching:** `@tanstack/react-query` for server(local-IPC) state, no global client store needed yet (Zustand dependency can be dropped if auth ends up not needing cross-page shared state beyond React Query's cache — revisit in Phase 1).
- **Money/quantity math:** use `decimal.js` for all currency and effective-quantity (L×W) calculations to avoid float drift — the PRD's JS snippets are illustrative, not literal.
- **Document numbers:** sequential counters stored in DB (per PRD §9.4 note), not random suffixes — avoids collision risk the current spec flags as a known gap.

## Phase 0: Reset to Boilerplate — DONE

- [x] ~~Removed legacy root docs (`PRD.md`, `IMPLEMENTATION_GUIDE.md`, `EXECUTIVE_SUMMARY.md`, `DELIVERY_SUMMARY.md`, `QUICK_START.md`, `00_START_HERE.md`) — described the old sync-based architecture.~~
- [x] ~~Removed `_data/` (legacy Oracle CSV export) entirely, per your call not to migrate historical data.~~
- [x] ~~Removed `src/features/`, `src/stores/`, `src/hooks/`, `electron/handlers/` — old Products/Dashboard/Login pages and role model tied to the old schema.~~
- [x] ~~Removed old migrations `0001`–`0005` (sync infrastructure, audit log) — empty `electron/db/migrations/` kept via `.gitkeep`.~~
- [x] ~~Removed old DB test (asserted old tables: `cities`, `party_ledger`, `sync_queue`), old seed script/verify-seed tied to Oracle sample data.~~
- [x] ~~Reset `shared/types`, `shared/schemas`, `shared/constants`, `electron/preload.ts`, `src/global.d.ts`, `electron/main.ts`, `src/App.tsx` to minimal stubs — kept `Result<T>`, window creation, DB init, a single `app:getVersion` IPC round-trip to prove the shell boots.~~
- [x] ~~Verified: `npx tsc --noEmit` clean, `npm test` passes (1 test — the still-valid SQLite-syntax check), `npx vite build` succeeds.~~
- **Committed** across 3 commits: `38b8b26d` (reset), `35c3f9c3` (this plan doc), `2b4e0377`+ (Phase 1 tasks below).

## Phase 1: Foundation — Schema, Contracts, Local Auth

- [x] ~~**Task 1.1** — Write `0001_init.sql`: tables for all 12 PRD entities (§4.2–§4.13: `products`, `categories`, `brands`, `customers`, `suppliers`, `sale_invoices`, `purchase_orders`, `quotations`, `expenses`, `stock_movements`, `payments`, `users`), plus two sequence tables for invoice/PO/quotation numbering, **plus a single-row `settings` table** (company_name, address, phone, email — used by print templates per the resolved Open Question below; not in the PRD's entity list because the PRD assumes "Fazal Hardware" is hardcoded, but one table is cheaper than string-replacing every print template later).~~
  - ~~Acceptance: fresh DB boot creates all 13 tables; `settings` seeded with one row defaulting to `company_name = 'Fazal Hardware'`; foreign keys enforced (`PRAGMA foreign_keys`); enum-like fields stored as `TEXT` with app-level validation via zod.~~
  - ~~Verify: extend `electron/db/__tests__/db.test.ts` (recreate it) to assert `sqlite_master` contains every table name, including `settings`.~~
  - Dependencies: None.
  - Files: `electron/db/migrations/0001_init.sql`, `electron/db/__tests__/db.test.ts`.
  - **Done** (commit `2b4e0377`): built one generic `doc_sequences` counter table (keyed by doc type) instead of the two sequence tables described above — same effect, less schema; flagged to you at the time. 6/6 tests passing, `tsc --noEmit` clean, `vite build` succeeds.

- [x] ~~**Task 1.2** — Define `shared/types` and `shared/schemas` for all 12 entities (TS interfaces + zod create/update schemas), matching PRD field lists exactly (incl. `variant_attributes` JSON, `purchase_unit_factor`, enums for `base_unit`/`payment_mode`/`status`/etc.).~~
  - ~~Acceptance: every entity has a type + a zod schema; `npx tsc --noEmit` clean.~~
  - ~~Verify: typecheck; one unit test per schema confirming a valid/invalid payload.~~
  - Dependencies: 1.1.
  - Files: `shared/types/index.ts`, `shared/schemas/index.ts`.
  - **Done** (commit `ba527395`): IDs typed as `number` (SQLite autoincrement), not the PRD's illustrative `string` (a Mongo-era assumption from the old Base44 backend) — flagging since it's a deliberate deviation worth knowing about if you cross-reference the PRD directly. Types are camelCase; DB columns stay snake_case, mapped in handlers starting Phase 2. 20/20 tests passing (TDD: wrote `shared/schemas/__tests__/schemas.test.ts` first, confirmed 14/14 RED, then GREEN), `tsc --noEmit` clean, `vite build` succeeds.

- [x] ~~**Task 1.3** — Local auth: seed one admin user on first run (bcrypt hash), `auth:login`/`auth:logout`/`auth:getCurrentUser` IPC, `LoginPage`, session kept in a small Zustand store (or React Query cache — decide during implementation per Architecture Decisions above), protected-route wrapper in `App.tsx`. **Ships admin-only** (resolved Open Question below) — the `users.role` column still exists (so later roles don't require a migration), but every route/action is gated on "is logged in," not on role. No permission matrix is built now.~~
  - ~~Acceptance: app launches to `/login` when logged out; valid admin credentials reach a protected shell; invalid credentials show an error; session persists across reload (no token expiry, per PRD §20.2); there is no role-based route restriction yet.~~
  - ~~Verify: manual run (`npm run dev`); vitest for the login IPC handler (invalid password, inactive user, success).~~
  - Dependencies: 1.1, 1.2.
  - Files: `electron/main.ts` (IPC handlers), `electron/preload.ts`, `src/global.d.ts`, `src/features/auth/LoginPage.tsx`, `src/App.tsx`.
  - **Done** (commit `7f92c2bd`): went with Zustand (`src/stores/authStore.ts`) over React Query cache for session state. Default admin seeded as `admin@fazalhardware.local` / `admin123` on first empty-DB boot (logged, not surfaced in UI — a real first-run credential picker is Phase 13 Task 13.4, out of scope here). 8/8 new tests passing via TDD (RED confirmed before `electron/handlers/auth.ts` existed). **Not verified**: the actual `npm run dev` Electron launch and clicking through login — that's a GUI app this environment can't run headless, so the manual half of the acceptance criteria still needs your eyes before this is fully signed off. Side fix: `npm test` was segfaulting intermittently (better-sqlite3's native binding isn't safe across vitest's default worker-thread pool) — added `pool: 'forks'` to `vite.config.ts`; confirmed crash before, clean (repeatedly) after.

### Checkpoint — Foundation
- [x] ~~`npm test` passes, `npx tsc --noEmit` clean, `npm run dev` boots to login and a protected (even if empty) shell after auth.~~ — 30/30 tests, clean typecheck, both builds.
  - Manual run surfaced a real bug: a dev machine's `~/Library/Application Support/fazal-pos-inventory/fazal.db` predated the Phase 0 reset (old sync-architecture schema), and its `schema_migrations` already recorded version 1 as applied — so the new `0001_init.sql` was silently skipped and login crashed on `no such column: email`. Fixed in commit `54c2d44e`: `electron/db/index.ts` now fails fast with a clear, actionable error on any DB with migration history but no `users.email` column, instead of a cryptic downstream SQL error. The stale file itself was deleted (your call, confirmed). **Not yet re-verified**: relaunch `npm run dev` and confirm login actually succeeds now — the login screen rendering was seen, but no successful login has been confirmed post-fix.
- [ ] Review with you before Phase 2.

## Phase 2: Catalog & Parties

- [x] ~~**Task 2.1** — Category & Brand CRUD: IPC handlers + `Settings` page with the two PRD tabs (§19), create/delete only (no edit, per PRD). **Plus a third "Company Info" tab** (resolved Open Question below) — edits the single `settings` row (name/address/phone/email) consumed by every print template in Phases 6/7/9.~~
  - ~~Acceptance: add/delete category and brand persists and reflects immediately in the list; editing company info persists and is reflected the next time a print template renders.~~
  - ~~Verify: vitest on handlers; manual check in Settings page.~~
  - Dependencies: 1.1–1.3.
  - Files: `electron/handlers/categories.ts`, `electron/handlers/brands.ts`, `electron/handlers/settings.ts`, `src/features/settings/SettingsPage.tsx`.
  - **Done, uncommitted** — 17 new tests (categories 7, brands 5, settings 3, + regression coverage) passing, 45/45 total. Added a minimal top-nav shell (`ProtectedShell` in `src/App.tsx`, Home/Settings links) so pages are reachable for manual testing before the real sidebar lands in Phase 12 — not styled to the PRD palette yet, that's explicitly deferred. `tsc --noEmit` clean, both builds succeed. **Not manually clicked through** — automated checks only this time, your call whether to verify in `npm run dev` before Task 2.2.

- [x] ~~**Task 2.2** — Product CRUD: handler + `ProductsPage` (list, search by name/category/brand/barcode/rack_location) + `ProductFormDialog` (two tabs: details, barcode lookup — barcode *input*, camera scanning deferred to a later polish task).~~
  - ~~Acceptance: create/edit/delete a product; low-stock indicator shows when `stock_on_hand <= reorder_level`; variant attributes render as "18mm · Commercial · 8x4".~~
  - ~~Verify: vitest on handler CRUD + validation; manual check of search and low-stock styling.~~
  - Dependencies: 2.1.
  - Files: `electron/handlers/products.ts`, `src/features/products/ProductsPage.tsx`, `src/features/products/ProductFormDialog.tsx`.
  - **Done, uncommitted** — added `ProductWithNames` to `shared/types` (not `electron/handlers/`) so the renderer isn't importing types from the main-process layer. 15 new tests (10 handler + 5 variant-parsing), 60/60 total. `tsc --noEmit` clean, both builds succeed. Not manually clicked through.

- [x] ~~**Task 2.3** — Customer CRUD + ledger balance field (§11). No ledger *dialog* yet — that lands in Phase 6 alongside Payments.~~
  - ~~Acceptance: create/edit/delete customer; `balance` defaults to 0 and is not directly editable from the form.~~
  - ~~Verify: vitest on handler; manual check.~~
  - Dependencies: 1.1–1.3.
  - Files: `electron/handlers/customers.ts`, `src/features/customers/CustomersPage.tsx`.
  - **Done, uncommitted** — `balance` isn't in `customerUpdateSchema` at all, so a caller-supplied `balance` in an update payload is silently stripped by zod rather than needing explicit filtering code; tested explicitly. 8/8 new tests.

- [x] ~~**Task 2.4** — Supplier CRUD + payable balance field (§12), mirroring 2.3 minus the `type` field.~~
  - ~~Acceptance / Verify: same shape as 2.3.~~
  - Dependencies: 1.1–1.3.
  - Files: `electron/handlers/suppliers.ts`, `src/features/suppliers/SuppliersPage.tsx`.
  - **Done, uncommitted** — same pattern as 2.3. 7/7 new tests.

### Checkpoint — Catalog & Parties
- [x] ~~Products, Categories, Brands, Customers, Suppliers all CRUD-able end to end through the UI.~~ — 75/75 tests passing, `tsc --noEmit` clean, both builds succeed. **Not manually clicked through this phase** — Task 2.1's login-screen-style manual check didn't happen for 2.2–2.4; worth a `npm run dev` pass before Phase 3 given none of Products/Customers/Suppliers UI has been visually confirmed yet.
- [ ] Review with you before Phase 3.

## Phase 3: Stock Management

- [ ] **Task 3.1** — `StockMovement` handler: create movement + atomically update `products.stock_on_hand`; types `adjustment | wastage | opening` per §8.3 sign rules.
  - Acceptance: wastage always subtracts, opening always adds, adjustment accepts signed quantity; movement row always created.
  - Verify: vitest covering all three types including sign edge cases.
  - Dependencies: 2.2.
  - Files: `electron/handlers/stock.ts`.

- [ ] **Task 3.2** — `StockPage`: All Stock / Low Stock tabs, `StockAdjustDialog`, `StockHistoryDialog` (§8.2–§8.4).
  - Acceptance: adjusting stock from the UI updates the on-hand value live; history dialog lists all movements for a product with correct +/- signs.
  - Verify: manual run through adjust → history flow.
  - Dependencies: 3.1.
  - Files: `src/features/stock/StockPage.tsx`, `src/features/stock/StockAdjustDialog.tsx`, `src/features/stock/StockHistoryDialog.tsx`.

### Checkpoint — Stock
- [ ] Stock adjustments correctly move `stock_on_hand` and leave an audit trail. Review before Phase 4.

## Phase 4: Sales & Billing (critical path)

- [ ] **Task 4.1** — Sequential invoice-number generator (table-backed counter, not random) + `SaleInvoice` handler skeleton (create/get/list only, no business logic yet).
  - Acceptance: concurrent-safe sequential numbers (e.g. `INV-20261018-0001`); list/get work on an empty table.
  - Verify: vitest generating N numbers concurrently, asserting uniqueness and order.
  - Dependencies: 1.1–1.3.
  - Files: `electron/handlers/sales.ts`, `electron/lib/sequences.ts`.

- [ ] **Task 4.2** — New Sale page shell: product search + add-to-cart, dimensional (L×W) toggle, line-item table with qty/length/width/price/discount/total, using the effective-qty formula (§22.1) via `decimal.js`.
  - Acceptance: adding a dimensional product with L×W computes `qty × L × W × price × (1 - disc%)`; toggling dimensional mode shows/hides L×W columns without losing entered data.
  - Verify: unit test on the line-total calculation helper; manual UI check.
  - Dependencies: 2.2, 4.1.
  - Files: `src/features/sales/NewSalePage.tsx`, `src/features/sales/lineTotal.ts`.

- [ ] **Task 4.3** — Submission logic end to end (§9.3): create invoice → per-line `StockMovement` (negative) + stock decrement → customer balance increase if unpaid → `Payment` record if `paid > 0`.
  - Acceptance: a credit sale leaves `stock_on_hand` reduced, `customers.balance` increased by the unpaid amount, and no stray Payment row; a cash sale creates a Payment and leaves balance untouched.
  - Verify: vitest covering cash / credit / partial payment modes end to end against a test DB.
  - Dependencies: 3.1, 4.2.
  - Files: `electron/handlers/sales.ts`.

- [ ] **Task 4.4** — Sales list page + `SaleDetailDialog` (§9.1, §9.5).
  - Acceptance: search by invoice #/customer; status badges match §6.5 colors; detail dialog shows full line items and totals.
  - Verify: manual check.
  - Dependencies: 4.3.
  - Files: `src/features/sales/SalesPage.tsx`, `src/features/sales/SaleDetailDialog.tsx`.

- [ ] **Task 4.5** — `SaleReturnDialog` + return logic (§9.6): per-item return ≤ sold qty, positive `StockMovement`, invoice status → `returned`, customer balance decreased.
  - Acceptance: returning part of an invoice restores stock and reduces the customer's balance by the return total only (not the full invoice).
  - Verify: vitest for partial and full returns.
  - Dependencies: 4.3, 4.4.
  - Files: `src/features/sales/SaleReturnDialog.tsx`, `electron/handlers/sales.ts`.

### Checkpoint — Sales
- [ ] Full counter-billing flow works: search → cart → payment → invoice → stock/balance updated → return reverses correctly. This is the PRD's highest-priority path (§2.3 target: <30s billing) — test it by hand, not just via vitest. Review before Phase 5.

## Phase 5: Purchases / GRN

- [ ] **Task 5.1** — Sequential PO-number generator + `PurchaseOrder` handler skeleton.
  - Dependencies: 1.1–1.3. Files: `electron/handlers/purchases.ts`.

- [ ] **Task 5.2** — New Purchase page: product search defaulting qty to `purchase_unit_factor` and price to `cost_price` (§10.2), no dimensional/discount columns.
  - Acceptance: adding a product pre-fills qty/price per the factor; line total = qty × price only.
  - Dependencies: 2.2, 5.1. Files: `src/features/purchases/NewPurchasePage.tsx`.

- [ ] **Task 5.3** — Submission logic (§10.3): positive `StockMovement`, stock increment, **and** `products.cost_price` updated to the latest purchase price; supplier balance increase if unpaid; Payment if `paid > 0`.
  - Acceptance: after a purchase, `cost_price` reflects the new purchase rate, not the old one.
  - Verify: vitest asserting cost_price mutation alongside stock/balance effects.
  - Dependencies: 3.1, 5.2.
  - Files: `electron/handlers/purchases.ts`.

- [ ] **Task 5.4** — Purchases list page + `PurchaseDetailDialog` (§10.1, §10.4).
  - Dependencies: 5.3. Files: `src/features/purchases/PurchasesPage.tsx`, `src/features/purchases/PurchaseDetailDialog.tsx`.

### Checkpoint — Purchases
- [ ] Purchase flow updates stock, cost price, and supplier payable correctly; GRN list/detail render. Review before Phase 6.

## Phase 6: Payments & Credit Accounts (Udhaar)

- [ ] **Task 6.1** — Manual `Payment` creation IPC (direction received/paid, reference_type `general`) + balance update (`max(0, balance - amount)`).
  - Dependencies: 1.1–1.3. Files: `electron/handlers/payments.ts`.

- [ ] **Task 6.2** — `LedgerDialog` (shared between Customers §11.3 and Suppliers §12.3) — balance display, payment form, payment history list.
  - Acceptance: receiving/recording a payment reduces balance and appears in history immediately.
  - Dependencies: 2.3, 2.4, 6.1. Files: `src/features/ledger/LedgerDialog.tsx`.

- [ ] **Task 6.3** — Payments list page: summary cards (Received/Paid totals), table with mode icons (§13.1).
  - Dependencies: 6.1. Files: `src/features/payments/PaymentsPage.tsx`.

- [ ] **Task 6.4** — Credit Accounts page (§14): aging calc (>30d overdue), 3 summary cards, `StatementDialog` with running balance, print-statement HTML window, `RecordPaymentDialog`.
  - Acceptance: aging flag matches `moment().diff(invoice.created_date,'days') > 30`; statement running balance is cumulative debit−credit; print opens a formatted window matching §14.4.
  - Verify: unit test for the aging calculation; manual check of statement print output.
  - Dependencies: 6.2. Files: `src/features/credit-accounts/CreditAccountsPage.tsx`, `src/features/credit-accounts/StatementDialog.tsx`.

### Checkpoint — Payments & Credit
- [ ] Every balance-affecting flow (sales, purchases, returns, manual payments) agrees with the ledger/statement view. Review before Phase 7.

## Phase 7: Quotations

- [ ] **Task 7.1** — Sequential QT-number generator + `Quotation` handler (create/get/list), reusing the sales line-item model.
  - Dependencies: 1.1–1.3, 4.2 (reuse line-item component). Files: `electron/handlers/quotations.ts`.

- [ ] **Task 7.2** — New Quotation page (§15.2): customer/phone/remarks/valid-until, same line-item UX as sales, print preview.
  - Dependencies: 7.1. Files: `src/features/quotations/NewQuotationPage.tsx`.

- [ ] **Task 7.3** — Quotations list + `ViewQuotationDialog` + print (§15.1, §15.4, §15.6).
  - Dependencies: 7.2. Files: `src/features/quotations/QuotationsPage.tsx`, `src/features/quotations/ViewQuotationDialog.tsx`.

- [ ] **Task 7.4** — Convert-to-invoice: **fix the known gap** (§26.2 #1–2) — properly pass quotation data into New Sale, set `quotation_id` on the resulting invoice, and update quotation status to `converted` (the old app silently failed to do all three).
  - Acceptance: converting a quotation creates an invoice referencing it and flips the quotation's status — verified by an explicit regression test, since this exact bug existed in the app we're replacing.
  - Verify: vitest end-to-end (quotation → convert → invoice.quotation_id set, quotation.status === 'converted').
  - Dependencies: 4.3, 7.3.
  - Files: `electron/handlers/quotations.ts`, `src/features/sales/NewSalePage.tsx`.

### Checkpoint — Quotations
- [ ] Quotation → invoice conversion verified correct (this was broken in the legacy app). Review before Phase 8.

## Phase 8: Daily Expenses

- [ ] **Task 8.1** — `Expense` handler + predefined expense-head list (§16.2).
- [ ] **Task 8.2** — Expenses page: CRUD dialog, month filter (`YYYY-MM`), summary cards (month total + top-3 heads by %).
  - Acceptance: month filter and top-3 aggregation match §16.1/§16.3 exactly.
  - Dependencies: 8.1. Files: `electron/handlers/expenses.ts`, `src/features/expenses/ExpensesPage.tsx`.

### Checkpoint — Expenses
- [ ] Expense CRUD + filtering verified. Review before Phase 9.

## Phase 9: Reports & Analytics

- [ ] **Task 9.1** — Report calculation module (§17.1), with the known gross-profit gap fixed: use `cost_price_at_time` from `StockMovement`, not current `product.cost_price` (§26.2 #5).
  - Acceptance: gross profit on a sale made before a cost-price change still reflects the cost at the time of sale.
  - Verify: vitest with a product whose cost_price changes between two sales.
  - Dependencies: Phases 3–5 (needs real stock movements + sales/purchases data).
  - Files: `electron/handlers/reports.ts`.

- [ ] **Task 9.2** — Reports page: 6 KPI cards + 5 tabs (Sales bar chart via Recharts, Top Products, Low Stock, Receivables, Payables) per §17.2.
  - Dependencies: 9.1. Files: `src/features/reports/ReportsPage.tsx`.

- [ ] **Task 9.3** — CSV export + Print/PDF export (window.print() HTML approach, or Electron `printToPDF` — decide during Phase 13) for all 5 tabs.
  - Dependencies: 9.2. Files: `src/features/reports/export.ts`.

### Checkpoint — Reports
- [ ] All 6 KPIs and 5 tabs render correct numbers against real transaction data; exports produce valid CSV/PDF. Review before Phase 10.

## Phase 10: AI Invoice Scanner

- [ ] **Task 10.1** — Gemini API integration in the **main process only** (API key never reaches the renderer, per §25.6/§18.5), with a graceful "offline — scanner unavailable" state.
  - Acceptance: API key read from env in main process; renderer never sees it; scanner UI shows a clear offline message when the call fails for network reasons.
  - Dependencies: 1.3. Files: `electron/handlers/aiScanner.ts`.

- [ ] **Task 10.2** — AIScanner page: 3-step flow (upload/camera → processing → review) per §18.2.
  - Dependencies: 10.1. Files: `src/features/ai-scanner/AIScannerPage.tsx`.

- [ ] **Task 10.3** — Fuzzy product-name matching (§18.3) + "Save to Purchases" (§18.4: filter matched-only → create PurchaseOrder with status=credit → StockMovements → cost_price update → supplier balance).
  - Acceptance: an extracted line item with no confident match is excluded from the save, not silently guessed.
  - Verify: vitest on the matching function with representative ambiguous names.
  - Dependencies: 5.3, 10.2.
  - Files: `electron/handlers/aiScanner.ts`.

### Checkpoint — AI Scanner
- [ ] A real (or representative test) invoice image scans, matches, and saves to Purchases correctly. Review before Phase 11.

## Phase 11: Dashboard (Home)

- [ ] **Task 11.1** — KPI calculations (§6.3: today's revenue, stock value, receivables, low-stock count) as a single aggregated IPC call.
- [ ] **Task 11.2** — Dashboard page: header, 4 KPI cards, Recent Sales, Low Stock, Balance Summary, Quick Actions (§6.4).
  - Dependencies: all of Phases 2–8 (dashboard reads from everything). Files: `electron/handlers/dashboard.ts`, `src/features/dashboard/DashboardPage.tsx`.

### Checkpoint — Dashboard
- [ ] Dashboard numbers cross-checked against the Reports page for consistency. Review before Phase 12.

## Phase 12: Navigation, Design System, Notifications

- [ ] **Task 12.1** — Sidebar + `AppLayout` (§5.1–§5.2): collapsible 232px↔68px, 5 nav groups, routes wired per §5.3.
- [ ] **Task 12.2** — Design tokens: Tailwind config + `index.css` with the exact HSL palette (§21.1), Inter/JetBrains Mono fonts, glassmorphism/mesh-gradient utility classes (§21.5).
- [ ] **Task 12.3** — `NotificationProvider` toast system (§24: 4 types, bottom-right, 5s auto-dismiss, progress bar).
  - Dependencies: all prior phases (wires them together under one shell). Files: `src/app/layout.tsx`, `src/index.css`, `tailwind.config.js`, `src/shared/NotificationProvider.tsx`.

### Checkpoint — Full App
- [ ] Every module reachable via the sidebar; visual design matches the PRD's palette; toasts fire on create/update/delete across modules. This is the "feature-complete, not yet production-hardened" milestone — demo to you before Phase 13.

## Phase 13: Electron-Specific Hardening

- [ ] **Task 13.1** — Native print/PDF for invoice, quotation, statement, and report templates (§23.3) — replace the old `window.open` HTML-print approach with `webContents.printToPDF()` or confirm the HTML-window approach is acceptable for v1.
- [ ] **Task 13.2** — Packaging: `electron-builder` targets (NSIS/DMG/AppImage per §25.7), `electron-updater` wiring.
- [ ] **Task 13.3** — Backup/restore: export/import the SQLite file (§25.4).
- [ ] **Task 13.4** — First-run admin setup flow, keyboard shortcuts (F1/F2/F3 per §26.3 Electron-only opportunities — optional/stretch).

**Explicitly out of scope for v1** (resolved Open Question below): thermal printer (ESC/POS) and direct barcode-scanner hardware integration (§26.3 #1). `docs/HARDWARE_REQUIREMENTS.md` only specs generic PC hardware (CPU/RAM/disk) and doesn't cover peripherals — and it's itself stale (references the old Hostinger-sync architecture and old seed-data counts), so it shouldn't be read as having settled this. Barcode input in Phase 2 stays a manual text field; a camera/USB-scanner integration and ESC/POS printing are backlog items for a post-v1 milestone, revisited once the core billing flow (Phase 4) is proven in the actual store.

### Checkpoint — Ship-Ready
- [ ] Packaged build installs and runs on at least one target OS; backup/restore round-trips a real database; printed documents are legible and correctly formatted.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sales/Purchases submission logic (stock + balance + payment, all in one transaction) has the highest bug surface in the whole app | High | Wrap each in a single `db.transaction()`; cover with vitest for every payment-mode/status combination before building the UI on top (Tasks 4.3, 5.3). |
| Quotation→Invoice conversion repeats the exact bug the legacy app shipped with | Med | Explicit regression test in Task 7.4 asserting all three side effects (invoice created, `quotation_id` set, status flipped). |
| AI Scanner requires a live Gemini API key/quota to test meaningfully | Med | Build the offline-degradation path first (Task 10.1) so the rest of the app doesn't depend on having a working key during development. |
| Reports gross-profit historically used the wrong cost field (legacy gap) | Med | Task 9.1 explicitly tests against `cost_price_at_time`, not current `cost_price`. |
| Large surface (14 modules) risks losing track of what's actually done vs. planned | Med | One checkpoint per phase, each gated on you reviewing before the next phase starts — don't skip these. |

## Resolved Decisions (formerly Open Questions)

- **Salesman/staff role permissions** — Ship Phase 1 with `admin`-only auth. The `users.role` column exists so a permission matrix can be added later without a migration, but no route or action is role-gated in v1. Applied in Task 1.3.
- **Settings entity** — Added a single-row `settings` table (company_name/address/phone/email) rather than hardcoding "Fazal Hardware" across every print template. Managed via a third "Company Info" tab on the Settings page. Applied in Tasks 1.1 and 2.1; consumed by the print templates in Phases 6, 7, and 9.
- **Thermal printer / barcode scanner hardware** — Deferred to a post-v1 backlog. `docs/HARDWARE_REQUIREMENTS.md` turned out to only spec generic PC hardware (and is itself a legacy doc referencing the old sync architecture) — it doesn't settle peripheral scope, so it's not being treated as having done so. Barcode entry stays a manual text field (Task 2.2); ESC/POS thermal printing is out of scope for Phase 13. Revisit once Phase 4 (core billing) is proven in-store. **Separately:** `docs/HARDWARE_REQUIREMENTS.md` itself should probably be refreshed or retired since it still describes the old Hostinger-sync deployment plan — flagging for your call, not doing it unprompted since it wasn't part of the original reset scope.
