# Product Requirements Document (PRD)
## Fazal Hardware — Inventory Management & Billing System
### For Electron Desktop Rebuild

**Document Version:** 1.0  
**Date:** October 2026  
**Product:** Fazal Hardware  
**Purpose:** Complete specification to rebuild the existing web app as an Electron desktop application  

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users & Context](#2-target-users--context)
3. [Tech Stack & Architecture (Electron Target)](#3-tech-stack--architecture-electron-target)
4. [Data Model / Database Schema](#4-data-model--database-schema)
5. [Navigation & App Structure](#5-navigation--app-structure)
6. [Module 1: Dashboard (Home)](#module-1-dashboard-home)
7. [Module 2: Products & Catalog](#module-2-products--catalog)
8. [Module 3: Stock Management](#module-3-stock-management)
9. [Module 4: Sales & Billing](#module-4-sales--billing)
10. [Module 5: Purchases / GRN](#module-5-purchases--grn)
11. [Module 6: Customers](#module-6-customers)
12. [Module 7: Suppliers](#module-7-suppliers)
13. [Module 8: Payments](#module-8-payments)
14. [Module 9: Credit Accounts (Udhaar)](#module-9-credit-accounts-udhaar)
15. [Module 10: Quotations](#module-10-quotations)
16. [Module 11: Daily Expenses](#module-11-daily-expenses)
17. [Module 12: Reports & Analytics](#module-12-reports--analytics)
18. [Module 13: AI Invoice Scanner](#module-13-ai-invoice-scanner)
19. [Module 14: Settings (Categories & Brands)](#module-14-settings-categories--brands)
20. [Authentication & User Management](#authentication--user-management)
21. [Design System & UI Specifications](#design-system--ui-specifications)
22. [Business Logic & Calculations](#business-logic--calculations)
23. [Print / PDF Generation](#print--pdf-generation)
24. [Notification System](#notification-system)
25. [Electron-Specific Considerations](#electron-specific-considerations)
26. [Future / Out of Scope](#future--out-of-scope)

---

## 1. Product Overview

### 1.1 What It Is
Fazal Hardware is a complete, real-time inventory management and billing system designed specifically for **hardware and building material businesses** in Pakistan. It replaces legacy Oracle-based systems with a modern, fast, and easy-to-use platform.

### 1.2 Core Value Proposition
- **Dimensional selling** (Length × Width) for sheets, plywood, tiles, glass — products sold by area, not just quantity
- **Credit account tracking** (udhaar) with aging indicators and printable statements
- **AI-powered invoice scanning** — photograph any supplier bill (even handwritten), AI reads items and auto-enters them
- **Quotation management** — create price quotes, convert to invoices with one click
- **Multi-price tiers** — retail vs wholesale pricing
- **Freight/carriage tracking** on every transaction
- **Barcode scanner** integration for product management
- **Printable/PDF reports** for sales, stock, receivables, payables, account statements

### 1.3 Business Context
- **Currency:** Pakistani Rupee (PKR), formatted as `PKR 12,345` or `PKR 12,345.50`
- **Language:** English UI (business terms), designed for Pakistani shop owners
- **Shop Type:** Hardware, plywood, sanitary, building materials, construction supplies
- **Users:** Shop owner (admin), salesmen (staff)

---

## 2. Target Users & Context

### 2.1 User Roles
| Role | Permissions |
|------|------------|
| **Admin (Shop Owner)** | Full access — all modules, settings, user management, delete records |
| **Salesman (Staff)** | Sales, purchases, stock views, customers (TBD — role-based access is a planned feature) |

### 2.2 User Personas
- **Shop Owner (Admin):** Wants daily P&L visibility, stock control, credit tracking, supplier payables, and professional quotations
- **Salesman:** Needs fast billing at the counter — search product, enter qty, print invoice in under 30 seconds
- **Accountant:** Needs reports, receivables/payables aging, expense tracking, CSV exports

### 2.3 Usage Patterns
- **Counter billing:** High-speed product search → cart → payment → print (target: < 30s per invoice)
- **End of day:** Review sales, check stock alerts, record expenses, review credit accounts
- **Monthly:** Download reports, review P&L, check receivables aging
- **Supplier visits:** Record purchases, track payables, scan supplier invoices

---

## 3. Tech Stack & Architecture (Electron Target)

### 3.1 Current Stack (Web App)
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix primitives) |
| Icons | lucide-react |
| Charts | Recharts |
| Date | moment.js, date-fns |
| State | React hooks (useState/useEffect), @tanstack/react-query |
| Backend | Base44 BaaS (entities = MongoDB-backed API) |
| Auth | Base44 Auth (email/password, Google OAuth) |
| Notifications | Custom toast system (NotificationProvider) |

### 3.2 Electron Target Stack
| Layer | Recommended Technology |
|-------|----------------------|
| Shell | Electron (main + renderer processes) |
| Frontend | React 18 + Vite (renderer) |
| Styling | Tailwind CSS + shadcn/ui (same) |
| Database | SQLite (via better-sqlite3 or Prisma + SQLite) — local, offline-first |
| ORM | Prisma or Drizzle ORM (SQLite adapter) |
| IPC | Electron ipcMain/ipcRenderer for DB operations |
| Auth | Local auth (bcrypt for password hashing, no cloud) |
| AI Scanner | Google Gemini API (API key in env) or local Tesseract OCR fallback |
| PDF/Print | Electron's native printToPDF or pdf-lib |
| Charts | Recharts (same) |
| Icons | lucide-react (same) |
| File Storage | Local filesystem (app data directory) |

### 3.3 Architecture Pattern
```
Electron Main Process
├── Database (SQLite via Prisma/better-sqlite3)
├── IPC Handlers (CRUD operations)
├── AI Scanner Service (Gemini API calls)
├── File Storage Service (invoices, images)
└── Print Service (PDF generation)

Electron Renderer Process
├── React App (same UI as current web app)
├── IPC Bridge (window.electronAPI.* calls)
├── Tailwind + shadcn/ui
└── Recharts
```

### 3.4 Key Architectural Decisions for Electron
1. **Offline-first:** All data stored locally in SQLite — no internet required for core operations
2. **Single-user or multi-user on LAN:** SQLite supports local; for multi-machine, use SQLite over network share or switch to PostgreSQL
3. **Backup:** Export/import database as SQLite file
4. **AI Scanner:** Requires internet for Gemini API; implement graceful degradation when offline
5. **Auto-update:** electron-updater for distributing new versions

---

## 4. Data Model / Database Schema

### 4.1 Entities Overview

The app uses **11 entities** (database tables). Below is the complete schema for each, including field types, constraints, and relationships.

### 4.2 Product
```
Product
├── id (string, PK, auto-generated)
├── name (string, required) — "PVC Pipe 1/2 inch"
├── category_id (string, FK → Category.id)
├── brand_id (string, FK → Brand.id)
├── variant_attributes (string, JSON) — '{"thickness":"18mm","grade":"Commercial"}'
├── base_unit (string, required) — "piece", "foot", "kg", "sheet", "meter", "bag", etc.
├── purchase_unit (string) — "carton", "bundle", "bag" (how you buy from supplier)
├── purchase_unit_factor (number) — 50 (50 pieces per carton)
├── retail_price (number) — price per base_unit for retail customers
├── wholesale_price (number) — price per base_unit for contractors/bulk
├── cost_price (number) — what you paid supplier per base_unit
├── reorder_level (number) — alert threshold
├── rack_location (string) — "Rack A3", "Shelf B2"
├── barcode (string) — barcode number
├── stock_on_hand (number, default 0) — current stock in base units
├── is_active (boolean, default true)
├── created_date (datetime, auto)
├── updated_date (datetime, auto)
└── created_by_id (string, auto)
```

**Units of measure (enum):**
`piece, foot, meter, kg, sheet, litre, box, set, pair, roll, bag, bundle, carton, dozen`

### 4.3 Category
```
Category
├── id (string, PK)
├── name (string, required) — "Sanitary", "Plywood", "Paints"
├── parent_id (string, FK → Category.id) — for subcategories (hierarchical)
├── created_date, updated_date, created_by_id
```

### 4.4 Brand
```
Brand
├── id (string, PK)
├── name (string, required) — "Master Paints", "Agha Steel"
├── created_date, updated_date, created_by_id
```

### 4.5 Customer
```
Customer
├── id (string, PK)
├── name (string, required)
├── phone (string)
├── type (enum: "retail" | "contractor" | "wholesale")
├── address (string)
├── balance (number, default 0) — outstanding receivable (positive = they owe us)
├── created_date, updated_date, created_by_id
```

### 4.6 Supplier
```
Supplier
├── id (string, PK)
├── name (string, required)
├── phone (string)
├── address (string)
├── balance (number, default 0) — outstanding payable (positive = we owe them)
├── created_date, updated_date, created_by_id
```

### 4.7 SaleInvoice
```
SaleInvoice
├── id (string, PK)
├── invoice_number (string, required, unique) — "INV-20260829-3632"
├── customer_id (string, FK → Customer.id, optional for walk-in)
├── customer_name (string) — display name (denormalized)
├── items (string, JSON array) — line items (see below)
├── subtotal (number) — sum of line totals before discount
├── discount_amount (number, default 0) — overall discount in PKR
├── freight_amount (number, default 0) — freight/carriage charge
├── total (number, required) — subtotal - discount + freight
├── paid_amount (number, default 0)
├── payment_mode (enum: "cash" | "card" | "credit" | "partial")
├── status (enum: "completed" | "credit" | "partial" | "returned", default "completed")
├── price_tier (enum: "retail" | "wholesale", default "retail")
├── quotation_id (string, FK → Quotation.id) — if converted from quote
├── notes (string)
├── created_date, updated_date, created_by_id
```

**Items JSON structure:**
```json
[
  {
    "product_id": "abc123",
    "product_name": "Plywood Commercial 18mm",
    "quantity": 2,
    "unit": "sheet",
    "length": 8,
    "width": 4,
    "unit_price": 2500,
    "discount_percent": 5,
    "line_total": 38000
  }
]
```

### 4.8 PurchaseOrder
```
PurchaseOrder
├── id (string, PK)
├── po_number (string, required, unique) — "PO-20260829-4353"
├── supplier_id (string, FK → Supplier.id)
├── supplier_name (string) — display name (denormalized)
├── items (string, JSON array) — line items
├── subtotal (number)
├── freight_amount (number, default 0)
├── total (number, required) — subtotal + freight
├── paid_amount (number, default 0)
├── payment_mode (enum: "cash" | "card" | "credit" | "partial")
├── status (enum: "received" | "partial" | "credit" | "returned", default "received")
├── notes (string)
├── created_date, updated_date, created_by_id
```

**Items JSON structure:**
```json
[
  {
    "product_id": "abc123",
    "product_name": "Cement Bag",
    "quantity": 50,
    "unit": "bag",
    "unit_price": 1200,
    "line_total": 60000
  }
]
```

### 4.9 Quotation
```
Quotation
├── id (string, PK)
├── quotation_number (string, required, unique) — "QT-263840"
├── customer_id (string, FK → Customer.id, optional)
├── customer_name (string)
├── customer_phone (string)
├── remarks (string)
├── items (string, JSON array) — same structure as SaleInvoice items
├── subtotal (number)
├── discount_amount (number, default 0)
├── freight_amount (number, default 0)
├── total (number)
├── status (enum: "draft" | "sent" | "converted" | "cancelled", default "draft")
├── converted_to_invoice_id (string, FK → SaleInvoice.id)
├── valid_until (date)
├── notes (string)
├── created_date, updated_date, created_by_id
```

### 4.10 Expense
```
Expense
├── id (string, PK)
├── date (date, required)
├── expense_head (string, required) — "Rent", "Electricity", "Salary / Wages", etc.
├── description (string)
├── amount (number, required)
├── payment_mode (enum: "cash" | "bank_transfer" | "cheque" | "other", default "cash")
├── reference (string) — receipt or reference number
├── notes (string)
├── created_date, updated_date, created_by_id
```

**Expense heads (predefined list):**
`Rent, Electricity, Salary / Wages, Transport / Freight, Maintenance, Telephone / Internet, Printing & Stationery, Bank Charges, Miscellaneous, Other`

### 4.11 StockMovement
```
StockMovement
├── id (string, PK)
├── product_id (string, FK → Product.id, required)
├── type (enum: "purchase" | "sale" | "sale_return" | "purchase_return" | "adjustment" | "wastage" | "opening")
├── quantity (number, required) — positive for in, negative for out
├── reference_type (enum: "sale_invoice" | "purchase_order" | "adjustment" | "wastage" | "opening" | "sale_return" | "purchase_return")
├── reference_id (string) — ID of the reference document
├── notes (string)
├── cost_price_at_time (number) — cost price per base unit at time of movement
├── created_date, updated_date, created_by_id
```

### 4.12 Payment
```
Payment
├── id (string, PK)
├── party_type (enum: "customer" | "supplier", required)
├── party_id (string, required) — Customer.id or Supplier.id
├── party_name (string) — display name (denormalized)
├── amount (number, required)
├── direction (enum: "received" | "paid", required) — received = money in, paid = money out
├── mode (enum: "cash" | "card" | "bank_transfer" | "cheque" | "other", required)
├── reference_type (enum: "sale_invoice" | "purchase_order" | "general")
├── reference_id (string)
├── notes (string)
├── created_date, updated_date, created_by_id
```

### 4.13 User (Built-in)
```
User
├── id (string, PK)
├── email (string)
├── full_name (string)
├── role (enum: "admin" | "user", default "admin")
├── created_date, updated_date
```
> Note: Users cannot be created via API — they join via invites. In Electron, implement local user management with bcrypt.

### 4.14 Entity Relationship Diagram (Text)
```
Product ──┬── Category
          ├── Brand
          ├── StockMovement (1:N)
          └── [SaleInvoice.items, PurchaseOrder.items, Quotation.items] (JSON ref)

Customer ──┬── SaleInvoice (1:N)
           └── Payment (1:N, party_type=customer)

Supplier ──┬── PurchaseOrder (1:N)
           └── Payment (1:N, party_type=supplier)

SaleInvoice ──→ StockMovement (creates movements on sale)
PurchaseOrder ──→ StockMovement (creates movements on purchase)
Quotation ──→ SaleInvoice (converts to invoice)
```

---

## 5. Navigation & App Structure

### 5.1 Layout
- **Left sidebar** (fixed, collapsible 232px ↔ 68px) — dark navy gradient
- **Main content area** — light mesh-gradient background, max-width 1600px, 28px padding
- **No top bar** — page headers are per-page

### 5.2 Sidebar Navigation Groups

```
OVERVIEW
└── Dashboard (/)

INVENTORY
├── Products (/products)
├── Stock (/stock)
└── AI Scanner (/ai-scanner)

TRANSACTIONS
├── Sales (/sales)
├── Quotations (/quotations)
├── Purchases (/purchases)
├── Expenses (/expenses)
└── Payments (/payments)

PARTIES
├── Customers (/customers)
├── Suppliers (/suppliers)
└── Credit Accounts (/credit-accounts)

INSIGHTS
├── Reports (/reports)
└── Settings (/settings)

[Logout button at bottom]
```

### 5.3 Routes (Complete List)

| Route | Page Component | Description |
|------|---------------|-------------|
| `/` | Home | Dashboard with KPIs, recent sales, low stock, balance summary |
| `/products` | Products | Product catalog CRUD with search |
| `/stock` | Stock | Stock levels, adjustments, movement history |
| `/ai-scanner` | AIScanner | AI-powered invoice scanning |
| `/sales` | Sales | Sales invoice list with view/return |
| `/sales/new` | NewSale | Create new sales invoice (billing screen) |
| `/purchases` | Purchases | Purchase order list with view |
| `/purchases/new` | NewPurchase | Record new purchase/GRN |
| `/customers` | Customers | Customer CRUD with ledger view |
| `/suppliers` | Suppliers | Supplier CRUD with ledger view |
| `/payments` | Payments | All payment transactions log |
| `/credit-accounts` | CreditAccounts | Outstanding customer balances, statements, payments |
| `/quotations` | Quotations | Quotation list with view/convert |
| `/quotations/new` | NewQuotation | Create new quotation |
| `/expenses` | Expenses | Daily expense tracking |
| `/reports` | Reports | Analytics, charts, CSV/PDF export |
| `/settings` | Settings | Category & brand management |
| `/login` | Login | Auth page |
| `/register` | Register | Registration page |
| `/forgot-password` | ForgotPassword | Password reset request |
| `/reset-password` | ResetPassword | Password reset form |

### 5.4 Auth Flow
- All app routes (except `/login`, `/register`, `/forgot-password`, `/reset-password`) are wrapped in a `ProtectedRoute` component
- Unauthenticated users redirect to `/login`
- Post-login redirect: resolves `returnTo` query param, defaults to `/`
- **For Electron:** Replace cloud auth with local auth — bcrypt-hashed passwords in SQLite, no email verification needed

---

## 6. Module 1: Dashboard (Home)

### 6.1 Purpose
At-a-glance view of business health — revenue, stock, receivables, and quick actions.

### 6.2 Data Loaded on Mount
```javascript
Promise.all([
  Product.list(),           // all products
  SaleInvoice.list('-created_date', 50),  // recent 50 sales
  PurchaseOrder.list('-created_date', 50), // recent 50 purchases
  Customer.list(),          // all customers
  Supplier.list(),          // all suppliers
])
```

### 6.3 KPI Cards (4 cards, top row)
| Card | Value | Calculation | Icon |
|------|-------|-------------|------|
| Today's Revenue | `formatPKR(todayRevenue)` | Sum of `total` for sales where `created_date` starts with today's date | TrendingUp (blue) |
| Stock Value | `formatPKR(stockValue)` | Sum of `stock_on_hand * cost_price` for all products | Boxes (purple) |
| Receivables | `formatPKR(totalReceivable)` | Sum of `balance` for all customers | CreditCard (amber) |
| Low Stock Alerts | count | Products where `stock_on_hand <= reorder_level` | AlertTriangle (red/green) |

### 6.4 Sections
1. **Header:** "Good {morning/afternoon/evening}," with subtitle. Buttons: "New Purchase" (outline), "New Sale" (primary)
2. **KPI Cards:** 4-column grid (2-col on mobile)
3. **Recent Sales (2/3 width):** Last 6 sales — invoice #, customer name, date, status badge, total. Link to `/sales`
4. **Low Stock (1/3 width, top):** Top 5 low-stock products with progress bar (`stock_on_hand / reorder_level`). Link to `/stock`
5. **Balance Summary (1/3 width, bottom):** Receivables (amber) + Payables (rose) totals
6. **Quick Actions (bottom):** 4 cards — New Sale, New Purchase, Scan Invoice, View Reports

### 6.5 Status Badge Config (Sales)
```javascript
completed: { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
credit:    { label: 'Credit',  cls: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' }
partial:   { label: 'Partial', cls: 'bg-blue-100 text-blue-700 border-blue-200',         dot: 'bg-blue-500' }
returned:  { label: 'Returned',cls: 'bg-rose-100 text-rose-700 border-rose-200',         dot: 'bg-rose-500' }
```

---

## 7. Module 2: Products & Catalog

### 7.1 Purpose
Manage the product catalog — create, edit, delete products with full pricing, units, and stock info.

### 7.2 Product List Page (`/products`)
- **Header:** "Products" with count badge, "Add Product" button
- **Search:** Filters by name, category name, brand name, barcode, rack_location (client-side)
- **Table columns:** Product (name + variant attributes), Category, Brand, Stock (with low-stock warning), Retail Price, Cost Price, Location, Actions (edit/delete)
- **Low stock indicator:** Red text + AlertTriangle icon when `stock_on_hand <= reorder_level`
- **Variant attributes display:** Parsed from JSON, shown as "18mm · Commercial · 8x4"

### 7.3 Product Form Dialog (Add/Edit)
A modal dialog with two tabs:

**Tab 1: Product Details**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | Text | Yes | Full product name |
| Category | Select | | From Category entity |
| Brand | Select | | From Brand entity |
| Variant Details | Text | | JSON-like: "thickness:18mm, grade:Commercial" |
| Selling Unit (base_unit) | Select | Yes | piece, foot, meter, kg, sheet, litre, box, set, pair, roll, bag, bundle, carton, dozen |
| Purchase Unit | Select | | How you buy from supplier (carton, bundle, etc.) |
| Items Per Purchase Unit (factor) | Number | | e.g., 50 pieces per carton |
| Barcode | Text | | Barcode number |
| Retail Price (PKR) | Number | | Price for regular customers |
| Wholesale Price (PKR) | Number | | Price for contractors/bulk |
| Cost Price (PKR) | Number | | What you paid supplier |
| Low Stock Alert Level | Number | | Reorder threshold |
| Shelf/Rack Location | Text | | Physical location in shop |

**Tab 2: Barcode Lookup**
- Barcode scanner component (camera-based or manual entry)
- Auto-fills name, barcode, unit, price from scan

### 7.4 CRUD Operations
- **Create:** `Product.create({ ...form, stock_on_hand: 0 })`
- **Update:** `Product.update(id, data)`
- **Delete:** `Product.delete(id)` with confirmation prompt
- **Notifications:** Success toast on create/update/delete

---

## 8. Module 3: Stock Management

### 8.1 Purpose
View stock levels, adjust stock (add/remove/wastage/opening), and view movement history per product.

### 8.2 Stock List Page (`/stock`)
- **Header:** "Stock Management" with total inventory value subtitle, low-stock count badge
- **Search:** By product name, category, brand
- **Tabs:** "All Stock" and "Low Stock" (filtered)
- **Table columns:** Product (name + brand), Category, On Hand (with progress bar vs reorder level), Reorder Level, Value (stock_on_hand × cost_price), Actions

### 8.3 Stock Adjust Dialog
Triggered from "Adjust" button on each product row.

| Field | Type | Description |
|-------|------|-------------|
| Type | Select | "Adjustment (+/-)", "Wastage (subtract)", "Opening Balance (add)" |
| Quantity | Number | Amount to adjust (positive or negative for adjustment) |
| Notes | Textarea | Reason for adjustment |

**Logic:**
- `adjustment`: quantity can be + or -
- `wastage`: quantity is always negative (subtracted)
- `opening`: quantity is always positive (added)

**On save:**
1. Create `StockMovement` record with type, quantity, notes
2. Update `Product.stock_on_hand` += actualQty

### 8.4 Stock History Dialog
Triggered from clipboard icon on each product row.
- Shows all `StockMovement` records for that product
- Displays: date, type, quantity (with + / - sign), reference, notes

---

## 9. Module 4: Sales & Billing

### 9.1 Sales List Page (`/sales`)
- **Header:** "Sales" with invoice count badge, "New Sale" button
- **Search:** By invoice number or customer name
- **Summary:** Result count + total revenue of filtered results
- **Table columns:** Invoice #, Customer, Date, Total, Paid, Status badge, Actions (view, return)
- **Actions:** Eye icon → SaleDetailDialog; RotateCcw icon → SaleReturnDialog (hidden if status=returned)

### 9.2 New Sale Page (`/sales/new`) — THE BILLING SCREEN
This is the most critical screen — the counter billing flow.

**Layout:** 2-column grid (2/3 + 1/3 on desktop)

**Left Column (2/3):**

**Step 1 — Add Products:**
- Search input (autofocus) — filters products by name, barcode, rack_location
- "Dimensional (L×W)" toggle button — shows/hides Length & Width columns
- Search results dropdown: product name, unit, stock level (with low-stock warning), price, add button
- Clicking a product adds it to line items (or increments quantity if already added)

**Step 2 — Review Items:**
- Line items table with columns:
  - Product (name + stock available with over-stock warning)
  - Qty (editable number input)
  - Length (editable, only if dimensional mode on)
  - Width (editable, only if dimensional mode on)
  - Price (editable, pre-filled from retail/wholesale price)
  - Disc% (editable, 0-100)
  - Total (calculated)
  - Remove button

**Line total calculation:**
```javascript
const effectiveQty = (length > 0 && width > 0) ? qty * length * width : qty;
line_total = effectiveQty * unit_price * (1 - discount_percent / 100);
```

**Right Column (1/3):**

**Step 3 — Customer & Payment:**
- Customer select (optional — walk-in if blank)
- Price Type select: "Retail" or "Wholesale" (changes which price is used when adding products)
- Payment Method select:
  - "Cash — Paid now in cash"
  - "Card — Paid by debit/credit card"
  - "Credit — Customer will pay later"
  - "Partial — Paid some, rest on credit"
- If "Partial": shows "How much did they pay now?" input

**Bill Summary:**
- Subtotal (sum of line totals)
- Extra Discount (PKR) input
- Freight / Carriage (PKR) input
- Total = subtotal - discount + freight
- If credit: amber info box "{total} will be added to customer's udhaar"
- If partial: amber info box "{remaining} remains on udhaar"

**Submit Button:** "Complete Sale & Print"

### 9.3 Sale Submission Logic (Critical Business Logic)
```javascript
// 1. Calculate paid amount and status
const paid = paymentMode === 'credit' ? 0 
           : paymentMode === 'partial' ? Number(paidAmount) 
           : total;
const status = paid >= total ? 'completed' : (paid > 0 ? 'partial' : 'credit');

// 2. Create SaleInvoice
const invoice = await SaleInvoice.create({
  invoice_number: generateInvoiceNumber(),  // "INV-YYYYMMDD-XXXX"
  customer_id, customer_name, items: JSON.stringify(lineItems),
  subtotal, discount_amount, freight_amount, total, paid_amount,
  payment_mode, status, price_tier,
});

// 3. For each line item: create StockMovement + decrement Product.stock_on_hand
for (const li of lineItems) {
  await StockMovement.create({
    product_id: li.product_id,
    type: 'sale',
    quantity: -Math.abs(li.quantity),
    reference_type: 'sale_invoice',
    reference_id: invoice.id,
    cost_price_at_time: product.cost_price,
  });
  await Product.update(product.id, {
    stock_on_hand: (product.stock_on_hand || 0) - Math.abs(li.quantity),
  });
}

// 4. If customer selected and not fully paid: increase Customer.balance
if (customerId && status !== 'completed') {
  await Customer.update(customerId, {
    balance: (customer.balance || 0) + (total - paid),
  });
}

// 5. If paid > 0 and customer selected: create Payment record
if (paid > 0 && customerId) {
  await Payment.create({
    party_type: 'customer',
    party_id: customerId,
    party_name: customerName,
    amount: paid,
    direction: 'received',
    mode: paymentMode === 'partial' ? 'cash' : paymentMode,
    reference_type: 'sale_invoice',
    reference_id: invoice.id,
  });
}

// 6. Show success notification, reset form
```

### 9.4 Invoice Number Generation
```javascript
function generateInvoiceNumber() {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `INV-${ts}-${rand}`;  // e.g., "INV-20260829-3632"
}
```
> **For Electron:** Consider using a sequential counter stored in DB instead of random, to avoid collisions.

### 9.5 Sale Detail Dialog
Modal showing invoice details: customer, date, price tier, items table (name, qty, rate, total), subtotal, discount, total, paid.

### 9.6 Sale Return Dialog
- Shows all items from the invoice with return quantity inputs (max = sold quantity)
- Notes field
- **On return:**
  1. For each returned item: create `StockMovement` (type=sale_return, positive qty) + increment `Product.stock_on_hand`
  2. Update `SaleInvoice.status` to "returned"
  3. If customer was linked: decrease `Customer.balance` by return total

---

## 10. Module 5: Purchases / GRN

### 10.1 Purchases List Page (`/purchases`)
- **Header:** "Purchases" with order count badge, "New Purchase" button
- **Search:** By PO number or supplier name
- **Summary:** Result count + total spend
- **Table columns:** PO #, Supplier, Date, Total, Status badge, Actions (view)
- **Status config:** received (green), credit (amber), partial (blue), returned (rose)

### 10.2 New Purchase Page (`/purchases/new`)
**Layout:** Same 2-column as New Sale

**Left Column:**

**Step 1 — Add Products You Received:**
- Search input (autofocus) — by name or barcode
- Results show: product name, purchase unit, current stock, cost price, add button
- **Key difference from sales:** When adding a product, default quantity = `purchase_unit_factor` (e.g., 50 for a carton of 50 pieces), default price = `cost_price`

**Step 2 — Review Quantities & Prices:**
- Line items table: Product (name + unit), Quantity (editable), Rate (editable), Total (calculated), Remove
- **No dimensional selling** in purchases (only in sales/quotations)
- Line total = `quantity × unit_price` (no discount per line in purchases)

**Right Column:**

**Step 3 — Supplier & Payment:**
- Supplier select (optional)
- Payment Method: cash, card, credit, partial (same as sales)
- If partial: "Amount Paid Now" input

**Bill Total:**
- Subtotal (sum of line totals)
- Freight / Carriage (PKR) input
- Total = subtotal + freight (no discount in purchases)
- If credit: amber info "{total} will be added to supplier's payable"

**Submit:** "Record Purchase & Update Stock"

### 10.3 Purchase Submission Logic
```javascript
// 1. Calculate paid and status (same logic as sales)
const paid = paymentMode === 'credit' ? 0 : paymentMode === 'partial' ? Number(paidAmount) : total;
const status = paid >= total ? 'received' : (paid > 0 ? 'partial' : 'credit');

// 2. Create PurchaseOrder
const po = await PurchaseOrder.create({
  po_number: generatePONumber(),  // "PO-YYYYMMDD-XXXX"
  supplier_id, supplier_name, items: JSON.stringify(lineItems),
  subtotal, freight_amount, total, paid_amount, payment_mode, status,
});

// 3. For each item: create StockMovement (positive) + increment stock + UPDATE cost_price
for (const li of lineItems) {
  await StockMovement.create({
    product_id: li.product_id,
    type: 'purchase',
    quantity: Math.abs(li.quantity),  // POSITIVE
    reference_type: 'purchase_order',
    reference_id: po.id,
    cost_price_at_time: li.unit_price,
  });
  await Product.update(product.id, {
    stock_on_hand: (product.stock_on_hand || 0) + Math.abs(li.quantity),
    cost_price: li.unit_price,  // UPDATE cost price to latest purchase price
  });
}

// 4. If supplier linked and not fully paid: increase Supplier.balance
if (supplierId && status !== 'received') {
  await Supplier.update(supplierId, {
    balance: (supplier.balance || 0) + (total - paid),
  });
}

// 5. If paid > 0 and supplier linked: create Payment (direction=paid)
if (paid > 0 && supplierId) {
  await Payment.create({
    party_type: 'supplier',
    party_id: supplierId,
    party_name: supplierName,
    amount: paid,
    direction: 'paid',
    mode: paymentMode === 'partial' ? 'cash' : paymentMode,
    reference_type: 'purchase_order',
    reference_id: po.id,
  });
}
```

### 10.4 Purchase Detail Dialog
Modal showing PO details: supplier, date, items table, subtotal, freight, total, paid, status.

---

## 11. Module 6: Customers

### 11.1 Customers List Page (`/customers`)
- **Header:** "Customers" with count badge, "Add Customer" button
- **Search:** By name or phone
- **Summary:** Customer count + total receivable
- **Table columns:** Customer (name + address), Contact (phone), Type badge, Balance (amber if >0, green if 0), Actions (ledger, edit, delete)

**Customer types:**
```javascript
retail:     { label: 'Retail',     cls: 'bg-blue-100 text-blue-700 border-blue-200' }
contractor: { label: 'Contractor', cls: 'bg-purple-100 text-purple-700 border-purple-200' }
wholesale:  { label: 'Wholesale',  cls: 'bg-amber-100 text-amber-700 border-amber-200' }
```

### 11.2 Add/Edit Customer Dialog
| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Phone | Text | |
| Type | Select (retail/contractor/wholesale) | |
| Address | Text | |

- On create: `balance: 0` is set initially
- On edit: all fields editable (balance is NOT edited here — only via payments)

### 11.3 Ledger Dialog
Triggered from eye icon on customer row.
- Shows current receivable balance at top (amber if >0)
- "Receive Payment" button → expands payment form (amount, mode, notes)
- Payment history list: all `Payment` records for this customer
  - Each entry: mode icon, direction, date, notes, amount
- **On payment:**
  1. Create `Payment` record (direction=received)
  2. Update `Customer.balance` = max(0, balance - amount)

---

## 12. Module 7: Suppliers

### 12.1 Suppliers List Page (`/suppliers`)
- **Header:** "Suppliers" with count badge, "Add Supplier" button
- **Search:** By name or phone
- **Summary:** Supplier count + total payable
- **Table columns:** Supplier (name + address), Contact (phone), Payable (rose if >0, green if 0), Actions (ledger, edit, delete)

### 12.2 Add/Edit Supplier Dialog
| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Phone | Text | |
| Address | Text | |

- On create: `balance: 0` initially
- No "type" field (unlike customers)

### 12.3 Ledger Dialog
Same as customer ledger but:
- Balance shown as "Payable Balance" (rose if >0)
- Button says "Record Payment" (not "Receive Payment")
- Payment direction = "paid" (money out to supplier)
- **On payment:**
  1. Create `Payment` record (direction=paid)
  2. Update `Supplier.balance` = max(0, balance - amount)

---

## 13. Module 8: Payments

### 13.1 Payments List Page (`/payments`)
- **Header:** "Payments" with record count badge
- **Summary cards (2-col):**
  - Total Received (emerald, ArrowDownLeft icon) — sum of payments where direction=received
  - Total Paid Out (rose, ArrowUpRight icon) — sum of payments where direction=paid
- **Search:** By party name or payment mode
- **Table columns:** Party (name), Type (customer/supplier badge), Direction (Received/Paid Out with arrow), Mode (with emoji icon), Date, Amount (+/- prefix)

**Payment mode icons:**
```javascript
cash: '💵', card: '💳', bank_transfer: '🏦', cheque: '📄', other: '🔄'
```

### 13.2 Payment Creation
Payments are created in two places:
1. **Automatically during sales/purchases** — when paid_amount > 0
2. **Manually via Ledger Dialog** — from customer/supplier ledger or credit accounts

---

## 14. Module 9: Credit Accounts (Udhaar)

### 14.1 Purpose
Dedicated view for managing outstanding customer balances — the "udhaar" (credit) system common in Pakistani retail.

### 14.2 Credit Accounts Page (`/credit-accounts`)
- **Header:** "Credit Accounts" with outstanding account count badge, total outstanding amount
- **Summary cards (3-col):**
  - Active Accounts (count of customers with balance > 0)
  - Total Receivable (sum of outstanding balances)
  - Highest Balance (largest single customer balance + name)

- **Table columns:** Customer (avatar with initial, name, "Xd overdue" if >30 days), Contact, Credit Invoices (count of unpaid invoices), Outstanding (amber/rose), Actions (Statement, Receive)

**Aging calculation:**
```javascript
const ageDays = Math.max(...pendingInvoices.map(inv => 
  moment().diff(moment(inv.created_date), 'days')
));
const isOverdue = ageDays > 30;  // Red if overdue
```

### 14.3 Statement Dialog
- Shows customer info + outstanding balance
- **Statement table:** Merged invoices + payments, sorted by date
  - Columns: Date, Description, Debit (invoice total), Credit (payment), Running Balance
  - Running balance = cumulative (debit - credit)
- **Buttons:** Close, Print Statement, Receive Payment

### 14.4 Print Statement (HTML → PDF)
Opens a new window with a professionally formatted HTML statement:
- Company header ("Fazal Hardware")
- Customer info box with outstanding balance badge
- Debit/Credit/Balance table with color coding (red debit, green credit, amber/green balance)
- "Print / Save PDF" button
- Footer: "Computer-generated statement"

### 14.5 Record Payment Dialog
- Shows customer name + outstanding balance
- Amount input (with "Max: {balance}" placeholder)
- Payment method select: cash, bank_transfer, card, cheque
- Notes field
- "Remaining after payment" preview
- **On confirm:**
  1. Create Payment (direction=received, reference_type=general)
  2. Update Customer.balance = max(0, balance - amount)

---

## 15. Module 10: Quotations

### 15.1 Quotations List Page (`/quotations`)
- **Header:** "Quotations" with count badge, "New Quotation" button
- **Search:** By quote number, customer name, or remarks
- **Summary:** Quote count + total value
- **Table columns:** Quote #, Customer (name + phone), Remarks, Date, Status badge, Total, Actions (View, Convert)

**Status config:**
```javascript
draft:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-600 border-slate-200' }
sent:      { label: 'Sent',      cls: 'bg-blue-100 text-blue-700 border-blue-200' }
converted: { label: 'Converted', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
cancelled: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
```

### 15.2 New Quotation Page (`/quotations/new`)
**Layout:** Same 2-column as New Sale

**Left Column:**
- Step 1: Product search (same as sales) + Dimensional (L×W) toggle
- Step 2: Line items table (same as sales — qty, length, width, price, disc%, total)

**Right Column:**
- Step 3: Customer & Details
  - Customer select (optional)
  - Customer Phone (editable, pre-filled from customer)
  - Remarks (text)
  - Valid Until (date, default = today + 7 days)

- Quote Summary: subtotal, discount, freight, net total
- Buttons: "Print" (opens print preview), "Save Quotation"

### 15.3 Quotation Number Generation
```javascript
function generateQTNumber() {
  return `QT-${Date.now().toString().slice(-6)}`;  // e.g., "QT-263840"
}
```

### 15.4 Print Quotation (HTML → PDF)
Opens new window with formatted quotation:
- Company header + "QUOTATION" title
- Customer info box + Valid Until box
- Items table (#, Product, Qty, L×W if dimensional, Rate, Amount)
- Totals box (subtotal, discount, freight, NET TOTAL)
- Footer: "Prices valid until {valid_until}"

### 15.5 Convert to Invoice
- Navigates to `/sales/new` with quotation data passed via router state
- Sets quotation status to "converted" (should be, though current code navigates without updating status — a known gap)
- **For Electron:** Implement proper conversion — create SaleInvoice from quotation items, set `quotation_id` on invoice, update quotation status

### 15.6 View Quotation Dialog
- Shows customer, date, valid until, items table, totals
- "Convert to Sale Invoice" button (if not already converted)

---

## 16. Module 11: Daily Expenses

### 16.1 Expenses Page (`/expenses`)
- **Header:** "Daily Expenses" with "Add Expense" button
- **Summary cards (4-col):**
  - Month Total (sum for selected month)
  - Top 3 expense heads (by amount, with % of total)

- **Filters:** Search (by head, description, reference) + Month picker (type=month)
- **Table columns:** Date, Head (badge), Description, Mode, Ref, Amount (rose), Actions (edit, delete)

### 16.2 Add/Edit Expense Dialog
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Date | Date | Yes | Default = today |
| Amount (PKR) | Number | Yes | Must be > 0 |
| Expense Head | Select | Yes | From predefined list |
| Description | Text | | Details |
| Payment Mode | Select | | cash, bank_transfer, cheque, other |
| Reference | Text | | Receipt or reference number |

**Expense heads (predefined):**
```
Rent, Electricity, Salary / Wages, Transport / Freight, Maintenance,
Telephone / Internet, Printing & Stationery, Bank Charges, Miscellaneous, Other
```

### 16.3 Month Filtering
```javascript
const filtered = expenses.filter(e => {
  const matchMonth = filterMonth ? e.date?.startsWith(filterMonth) : true;
  // ...
});
```
Filter month format: `YYYY-MM` (e.g., "2026-10")

---

## 17. Module 12: Reports & Analytics

### 17.1 Reports Page (`/reports`)
- **Header:** "Reports"
- **KPI Cards (6-col):** Revenue, Gross Profit, Stock Value, Low Stock, Receivables, Payables

**Calculations:**
```javascript
totalRevenue = sum of all SaleInvoice.total
totalCost = sum of (item.quantity × product.cost_price) for all sale items
grossProfit = totalRevenue - totalCost
stockValue = sum of (product.stock_on_hand × product.cost_price)
lowStockCount = count of products where stock_on_hand <= reorder_level
totalReceivable = sum of Customer.balance
totalPayable = sum of Supplier.balance
```

### 17.2 Tabs (5 tabs)

**Tab 1: Sales**
- Bar chart: Last 7 days sales (Recharts BarChart)
- X-axis: day abbreviation (Mon, Tue, ...)
- Y-axis: total revenue, formatted as "Xk"
- Export: CSV + Print/PDF

**Tab 2: Top Products**
- Table: #, Product, Qty Sold, Revenue
- Ranked by revenue (top 20)
- Calculated by aggregating all sale invoice items
- Export: CSV + PDF

**Tab 3: Low Stock**
- Table: Product, On Hand, Reorder Level, Deficit
- Sorted by stock ascending
- Export: CSV + PDF

**Tab 4: Receivables**
- Table: Customer, Phone, Outstanding Balance
- Sorted by balance descending
- Export: CSV + PDF

**Tab 5: Payables**
- Table: Supplier, Phone, Payable Balance
- Sorted by balance descending
- Export: CSV + PDF

### 17.3 Export Functions

**CSV Export:**
```javascript
function downloadCSV(filename, rows, headers) {
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  // ... download via anchor element
}
```

**PDF Export (HTML → Print):**
Opens new window with styled HTML table + "Print / Save PDF" button. Uses `window.print()` for PDF generation.

---

## 18. Module 13: AI Invoice Scanner

### 18.1 Purpose
Photograph any supplier invoice (printed or handwritten), AI reads all items and auto-enters them as a purchase order.

### 18.2 AIScanner Page (`/ai-scanner`)

**3-step flow:**

**Step 1: Upload**
- Info banner: "How does this work?"
- Drag-and-drop zone (click to choose file)
- 3 action buttons: "Choose File", "Take Photo" (camera capture), "Scan with AI"
- Tips cards: "Any quality works", "Handwritten OK", "Fast & automatic"
- Supported: JPG, PNG, PDF

**Step 2: Processing**
- Animated spinner with status messages:
  1. "Uploading invoice..."
  2. "AI is reading the invoice text..."
  3. "Matching items to your products..."

**Step 3: Review**
- Summary bar: "Invoice scanned successfully!" + matched/unmatched counts + "Scan Again"
- Invoice details: Supplier select, Invoice date (read-only from AI)
- Items table:
  - Status icon (green check if matched, amber alert if not)
  - "What AI Read" (description from invoice)
  - "Match to Your Product" (select dropdown — user must match)
  - Quantity (editable)
  - Rate (editable)
  - Total (calculated)
  - Remove button
- Footer: matched count, unmatched count, grand total, "Save to Purchases" button

### 18.3 AI Processing Logic

**Upload:**
```javascript
const { file_url } = await UploadPublicFile({ file });
```

**LLM Extraction:**
```javascript
const result = await InvokeLLM({
  prompt: `You are an expert at reading supplier invoices for a Pakistani building materials and hardware shop.
  Extract ALL items — even if handwritten, tilted, or low quality.
  Extract: supplier name, invoice date, ALL line items (description, quantity, unit, rate, amount), total.
  Numbers may be in Urdu/Hindi numerals — convert to Arabic.
  Return clean JSON only.`,
  file_urls: [file_url],
  response_json_schema: {
    type: "object",
    properties: {
      supplier_name: { type: "string" },
      invoice_date: { type: "string" },
      notes: { type: "string" },
      line_items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            rate: { type: "number" },
            amount: { type: "number" }
          }
        }
      },
      total: { type: "number" }
    }
  },
  model: 'gemini_3_flash'  // Gemini for vision + text
});
```

**Product Matching (fuzzy):**
```javascript
function findBestMatch(description, products) {
  const words = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  let bestMatch = null, bestScore = 0;
  for (const product of products) {
    const name = product.name.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (name.includes(word)) score += 2;
    }
    // Reverse matching
    for (const word of name.split(/\s+/)) {
      if (description.includes(word) && word.length > 2) score++;
    }
    if (score > bestScore && score >= 2) {
      bestScore = score;
      bestMatch = product;
    }
  }
  return bestMatch;
}
```

### 18.4 Save Logic
On "Save to Purchases":
1. Filter to only items with matched product_id
2. Create `PurchaseOrder` (status=credit, paid=0)
3. For each item: create `StockMovement` (type=purchase, positive qty) + increment `Product.stock_on_hand` + update `Product.cost_price`
4. If supplier linked: increase `Supplier.balance` by total
5. Navigate to `/purchases` after 3.5s

### 18.5 Electron Implementation Notes
- **Gemini API:** Use `@google/generative-ai` npm package or REST API with API key
- **Offline fallback:** Consider Tesseract.js for basic OCR when offline (lower accuracy)
- **File upload:** Not needed — read file directly from filesystem in main process

---

## 19. Module 14: Settings (Categories & Brands)

### 19.1 Settings Page (`/settings`)
- **Header:** "Settings"
- **Tabs:** Categories, Brands

**Categories Tab:**
- Input + "Add" button (Enter key also adds)
- List of categories with delete button (hover to show)
- Each category: icon (Tag, blue), name, trash button

**Brands Tab:**
- Input + "Add" button
- List of brands with delete button
- Each brand: icon (Bookmark, purple), name, trash button

### 19.2 CRUD
- **Create:** `Category.create({ name })` or `Brand.create({ name })`
- **Delete:** `Category.delete(id)` or `Brand.delete(id)`
- No edit functionality (delete + recreate instead)

---

## 20. Authentication & User Management

### 20.1 Current (Web — Base44 Auth)
- Email/password login
- Google OAuth
- Registration with email verification (OTP)
- Password reset via email
- Protected routes via `ProtectedRoute` component

### 20.2 Electron Target (Local Auth)
- **Local users:** Store in SQLite with bcrypt-hashed passwords
- **No email verification needed** (desktop app, single machine)
- **Roles:** admin (full access), user (limited — sales/purchases only, TBD)
- **Login screen:** Email + password, validate against local DB
- **Session:** Electron can stay logged in (no token expiry needed for desktop)
- **First-run setup:** Create admin user on first launch

### 20.3 Auth Pages (Existing)
| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | Email + password, Google button, forgot link |
| `/register` | Register | Email + password + confirm, Google, OTP verification |
| `/forgot-password` | ForgotPassword | Email → reset link |
| `/reset-password` | ResetPassword | Token + new password |

> **For Electron:** Simplify to just Login + (optional) user management in Settings. Remove OTP/email verification flows.

---

## 21. Design System & UI Specifications

### 21.1 Color Palette (HSL values)

```css
:root {
  /* Background — soft warm-light */
  --background: 220 25% 96%;
  --foreground: 222 30% 12%;

  /* Cards — pure white */
  --card: 0 0% 100%;
  --card-foreground: 222 30% 12%;

  /* Primary — blue-indigo */
  --primary: 228 72% 52%;
  --primary-foreground: 0 0% 100%;

  /* Secondary — light gray */
  --secondary: 220 18% 92%;
  --secondary-foreground: 222 25% 20%;

  /* Muted */
  --muted: 220 18% 94%;
  --muted-foreground: 220 12% 50%;

  /* Accent — warm amber */
  --accent: 38 95% 56%;
  --accent-foreground: 222 30% 10%;

  /* Status colors */
  --destructive: 4 78% 57%;
  --destructive-foreground: 0 0% 100%;
  --success: 150 62% 40%;
  --success-foreground: 0 0% 100%;
  --warning: 38 95% 56%;
  --warning-foreground: 222 30% 10%;

  /* Borders */
  --border: 220 18% 88%;
  --input: 220 18% 91%;
  --ring: 228 72% 52%;

  /* Chart colors */
  --chart-1: 228 72% 52%;  /* blue */
  --chart-2: 162 58% 42%;  /* green */
  --chart-3: 38 95% 56%;   /* amber */
  --chart-4: 275 55% 58%; /* purple */
  --chart-5: 344 72% 56%; /* rose */

  /* Radius */
  --radius: 0.75rem;

  /* Sidebar — slate navy */
  --sidebar-background: 224 38% 14%;
  --sidebar-foreground: 218 22% 72%;
  --sidebar-primary: 228 72% 62%;
  --sidebar-accent: 224 32% 20%;
  --sidebar-border: 224 28% 20%;
}
```

### 21.2 Typography
```css
--font-heading: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-display: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```
- Google Fonts import: Inter (100-900 weight) + JetBrains Mono (400, 500)

### 21.3 UI Components (shadcn/ui)
All from `@/components/ui/`:
- Button (variants: default, destructive, outline, secondary, ghost, link; sizes: default, sm, lg, icon)
- Input
- Select (Radix-based)
- Dialog (Radix-based)
- Tabs (Radix-based)
- Label
- Textarea
- Toast (custom NotificationProvider)
- Badge
- Table
- Tooltip
- And 30+ other shadcn primitives

### 21.4 Custom Components
| Component | Path | Purpose |
|-----------|------|---------|
| PageHeader | `shared/PageHeader.jsx` | Title + subtitle + actions + badge |
| StatCard | `shared/StatCard.jsx` | KPI card with icon, value, trend |
| SuccessNotification | `shared/SuccessNotification.jsx` | Alert banner |
| FieldTip / FieldLabel | `shared/FieldTip.jsx` | Label with help tooltip |
| NotificationProvider | `shared/NotificationProvider.jsx` | Global toast system |
| GlassTable | `shared/GlassTable.jsx` | Styled table wrapper |
| AppLayout | `layout/AppLayout.jsx` | Sidebar + main content |
| Sidebar | `layout/Sidebar.jsx` | Navigation |
| ProductFormDialog | `products/ProductFormDialog.jsx` | Product add/edit |
| BarcodeScanner | `products/BarcodeScanner.jsx` | Barcode scanning |
| StockAdjustDialog | `stock/StockAdjustDialog.jsx` | Stock adjustment |
| StockHistoryDialog | `stock/StockHistoryDialog.jsx` | Movement history |
| SaleDetailDialog | `sales/SaleDetailDialog.jsx` | Invoice detail view |
| SaleReturnDialog | `sales/SaleReturnDialog.jsx` | Return processing |
| PurchaseDetailDialog | `purchases/PurchaseDetailDialog.jsx` | PO detail view |
| LedgerDialog | `ledger/LedgerDialog.jsx` | Customer/supplier ledger |

### 21.5 Visual Effects
- **Glassmorphism:** `.glass` class — `backdrop-filter: blur(16px)`, semi-transparent white bg, white border
- **Mesh gradient background:** `.bg-mesh` — radial gradients in blue, cyan, amber, purple
- **Sidebar gradient:** `.sidebar-glass` — linear gradient navy
- **Shadows:** `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, colored shadows (`shadow-primary/20`)
- **Rounded corners:** `rounded-xl` (0.75rem), `rounded-2xl` (1rem)
- **Transitions:** `transition-colors`, `transition-all`, `duration-200`, `duration-300`

### 21.6 Responsive Design
- **Mobile (default):** Single column, 2-col grids for KPI cards
- **Tablet (md):** 2-4 column grids
- **Desktop (lg):** Full multi-column layouts, sidebar visible
- **Sidebar:** Collapsible (232px ↔ 68px), tooltips when collapsed
- **Tables:** Horizontal scroll on small screens (`overflow-x-auto`)

---

## 22. Business Logic & Calculations

### 22.1 Dimensional Selling (L × W)
For products sold by area (sheets, plywood, tiles, glass):
```javascript
// If both length and width are provided:
const effectiveQty = quantity * length * width;
// Otherwise:
const effectiveQty = quantity;

// Line total:
line_total = effectiveQty * unit_price * (1 - discount_percent / 100);
```
- Only available in Sales and Quotations (not Purchases)
- Toggle button to show/hide Length & Width columns

### 22.2 Price Tiers
```javascript
// When adding product to cart:
const price = priceTier === 'wholesale' 
  ? (product.wholesale_price || product.retail_price || 0) 
  : (product.retail_price || 0);
```
- Retail: normal shop price
- Wholesale: bulk/contractor rate (falls back to retail if not set)

### 22.3 Purchase Unit Conversion
When recording a purchase:
```javascript
// Default quantity when adding product = purchase_unit_factor
quantity: product.purchase_unit_factor || 1,
unit: product.purchase_unit || product.base_unit,

// Stock is incremented by the raw quantity (in base units if factor applied)
// Note: Current implementation adds raw quantity to stock_on_hand
// For Electron: Consider converting to base units: quantity * purchase_unit_factor
```

### 22.4 Payment Status Logic
```javascript
// Sales:
const paid = paymentMode === 'credit' ? 0 
           : paymentMode === 'partial' ? Number(paidAmount) 
           : total;
const status = paid >= total ? 'completed' 
             : paid > 0 ? 'partial' 
             : 'credit';

// Purchases (same logic, different status names):
const status = paid >= total ? 'received' 
             : paid > 0 ? 'partial' 
             : 'credit';
```

### 22.5 Balance Updates
**Customer balance (receivable):**
- On credit sale: `balance += (total - paid)`
- On payment received: `balance = max(0, balance - amount)`
- On sale return: `balance -= returnTotal`

**Supplier balance (payable):**
- On credit purchase: `balance += (total - paid)`
- On payment made: `balance = max(0, balance - amount)`

### 22.6 Stock Movement Flow
```
Sale          → StockMovement(type='sale',          qty=-N)  → Product.stock -= N
Purchase      → StockMovement(type='purchase',       qty=+N)  → Product.stock += N, cost_price updated
Sale Return   → StockMovement(type='sale_return',   qty=+N)  → Product.stock += N
Stock Adjust  → StockMovement(type='adjustment',     qty=±N)  → Product.stock ± N
Wastage       → StockMovement(type='wastage',        qty=-N)  → Product.stock -= N
Opening Stock → StockMovement(type='opening',        qty=+N)  → Product.stock += N
```

### 22.7 Number Formatting
```javascript
function formatPKR(amount) {
  return `PKR ${Number(amount).toLocaleString('en-PK', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2 
  })}`;
}
// Examples: PKR 0, PKR 12,345, PKR 12,345.50

function formatNumber(num) {
  return Number(num).toLocaleString('en-PK');
}
```

### 22.8 Document Number Generation
```javascript
// Invoice: INV-YYYYMMDD-XXXX (4-digit random)
generateInvoiceNumber() → "INV-20260829-3632"

// Purchase Order: PO-YYYYMMDD-XXXX
generatePONumber() → "PO-20260829-4353"

// Quotation: QT-XXXXXX (last 6 digits of timestamp)
generateQTNumber() → "QT-263840"
```

---

## 23. Print / PDF Generation

### 23.1 Current Approach
All printing uses `window.open('', '_blank')` → write HTML → `window.print()`. This opens a new browser tab with styled HTML and a "Print / Save PDF" button.

### 23.2 Print Templates

**1. Quotation Print** (from NewQuotation.jsx)
- Company header + "QUOTATION" title
- Customer info + valid until
- Items table with L×W column if dimensional
- Totals box (subtotal, discount, freight, NET TOTAL)
- Footer with validity date

**2. Account Statement Print** (from CreditAccounts.jsx)
- Company header + "Account Statement"
- Customer box with outstanding balance badge
- Debit/Credit/Balance table with running balance
- Color-coded: red debit, green credit, amber/green balance

**3. Report PDF** (from Reports.jsx)
- Company header + report title + generation date
- Data table with styled headers
- Footer with print date

### 23.3 Electron Print Approach
- Use Electron's `webContents.print()` or `printToPDF()` for native PDF generation
- Or keep the HTML window approach using `BrowserWindow` instead of `window.open`
- Consider `pdf-lib` for more control over PDF layout
- Thermal printer support: ESC/POS commands via `node-thermal-printer`

---

## 24. Notification System

### 24.1 Toast Notifications
Custom `NotificationProvider` with global `notify()` function:

```javascript
import { notify } from '../components/shared/NotificationProvider';

// Usage:
notify('Product deleted', 'info');
notify('Sale completed — PKR 5,000', 'success');
notify('Please add at least one product', 'error');
notify('Amount exceeds balance', 'warning');
```

### 24.2 Toast Types
| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| success | emerald | CheckCircle2 | Successful operations |
| error | rose | XCircle | Validation errors |
| warning | amber | AlertTriangle | Cautions |
| info | blue | Info | Neutral messages |

### 24.3 Toast Behavior
- Position: bottom-right, stacked vertically
- Width: 360px
- Auto-dismiss: 5000ms (configurable)
- Progress bar showing time remaining
- Click anywhere on toast to dismiss
- X button to close
- Slide-in animation (translate-x)
- Colored left bar (4px) matching type

### 24.4 SuccessNotification Component
Separate inline alert banner (not toast) used in forms:
- Shows after successful save
- Auto-close option (8000ms default)
- Can be dismissed manually

---

## 25. Electron-Specific Considerations

### 25.1 Database Migration
- **Current:** Base44 entities (MongoDB-backed API)
- **Electron:** SQLite via Prisma or better-sqlite3
- **Migration:** Export current data as JSON → import into SQLite
- **Schema:** Use the entity definitions in Section 4 as Prisma schema models

### 25.2 IPC Communication Pattern
```javascript
// Main process (main.js)
ipcMain.handle('products:list', async () => {
  return await prisma.product.findMany();
});
ipcMain.handle('products:create', async (event, data) => {
  return await prisma.product.create({ data });
});

// Renderer process (preload.js)
contextBridge.exposeInMainWorld('electronAPI', {
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    create: (data) => ipcRenderer.invoke('products:create', data),
  }
});

// React component
const products = await window.electronAPI.products.list();
```

### 25.3 Offline-First Design
- All CRUD operations work offline (local SQLite)
- AI Scanner requires internet (Gemini API) — show offline message when unavailable
- No real-time subscriptions needed (single-user desktop)
- Auto-save: Save to local DB immediately, no "saving..." spinner needed

### 25.4 File Storage
- Invoice images: Store in `app.getPath('userData') + '/invoices/'`
- Product images (if added): Same directory
- Database: `app.getPath('userData') + '/fazal-hardware.db'`
- Backups: Export SQLite file to user-chosen location

### 25.5 Auto-Update
- Use `electron-updater` for distributing new versions
- Check for updates on app launch
- Download in background, prompt user to install

### 25.6 Security
- **No cloud API keys in renderer** — keep Gemini API key in main process only
- **SQL injection:** Use Prisma parameterized queries
- **Local auth:** bcrypt for password hashing
- **Data encryption:** Consider SQLCipher for encrypted SQLite (optional)

### 25.7 Packaging
- **Windows:** NSIS installer (.exe)
- **Mac:** DMG with code signing
- **Linux:** AppImage or .deb
- **Auto-update:** GitHub releases as update server
- Use `electron-builder` for packaging

### 25.8 Performance
- SQLite is fast for local single-user — no pagination needed for most queries
- Preload all products/customers/suppliers on app launch (cache in memory)
- Debounce search inputs (300ms)
- Virtual scrolling for large tables (if >1000 rows)

---

## 26. Future / Out of Scope

### 26.1 Planned Features (Not Yet Implemented)
1. **Multi-user role-based permissions** — Admin vs Salesman access control
2. **Printable Sale Invoice template** — Thermal (80mm) + A4 formats
3. **Bulk opening stock entry** — Import opening stock via CSV/Excel
4. **Daily P&L and day-end cash summary** — Auto-generated daily reports
5. **Barcode printing** — Generate and print barcode labels for products
6. **Multi-shop/branch support** — Multiple locations with consolidated reporting
7. **WhatsApp integration** — Send invoices/quotations via WhatsApp
8. **SMS notifications** — Send payment reminders to credit customers
9. **GST/Tax configuration** — Configurable tax rates per product/invoice
10. **Loyalty points system** — Customer rewards program

### 26.2 Known Gaps in Current Implementation
1. **Quotation conversion** doesn't update quotation status to "converted" (navigates to NewSale but doesn't mark quote)
2. **Quotation → Invoice** data passing via router state isn't fully wired in NewSale (NewSale doesn't read `location.state.fromQuotation`)
3. **Purchase unit conversion** — stock is incremented by raw quantity, not converted to base units via `purchase_unit_factor`
4. **Sale return** re-fetches all products via `Product.list()` inside the loop (inefficient — should use the already-loaded products)
5. **Reports gross profit** uses current `cost_price` rather than `cost_price_at_time` from StockMovement (historical cost not tracked accurately)
6. **No pagination** on list pages — loads all records (works for small datasets, needs pagination for large)

### 26.3 Electron-Only Opportunities
1. **Hardware integration:** Direct barcode scanner, thermal printer, cash drawer support
2. **Local network sync:** Sync database between multiple machines on LAN
3. **Automatic backups:** Scheduled local backups
4. **System tray:** Minimize to system tray, quick-access window
5. **Keyboard shortcuts:** F1=New Sale, F2=New Purchase, F3=Search, etc.
6. **Offline AI OCR:** Tesseract.js for basic OCR when internet unavailable

---

## 27. Licensing & Activation (internal — vendor-only, not client-facing)

> **Superseded (v1.1):** the offline signed-file mechanism below was replaced by online activation with signed leases, an owner dashboard and an offline grace period. See `docs/LICENSING.md` and `license-server/`. Kept for history.

Not part of the client's requirements — added so the vendor (Fazal POS) can
control access to a paid install without depending on the client's internet
connection, consistent with §25.3's offline-first design.

### 27.1 Mechanism
- A **signed license file** (Ed25519; public key embedded in the app, private
  key held only by the vendor, never shipped) containing `clientName` and an
  `expiresAt` date. The app verifies the signature and expiry entirely
  locally — no network call, no backend.
- The vendor issues a new license file per client/renewal using
  `scripts/issue-license.js` (requires the private key from
  `scripts/generate-license-keypair.js`, generated once and kept outside the
  repo) and delivers it to the client out-of-band (email/USB) for import via
  the app's "Import License File" screen.
- Checked on every app launch, gating the entire app — including `/login` —
  so an unlicensed or expired install can't be used at all, not even to view
  existing data. See `electron/license/verify.ts`, `electron/license/store.ts`.

### 27.2 Known limitations (accepted for v1)
- **No remote kill switch.** Revocation only takes effect at the expiry date
  already baked into the issued license — there's no way to lock an install
  early without a backend. Issuing shorter-lived licenses (e.g. monthly) is
  the lever for enforcing payment cadence.
- **System clock can be rolled back** to delay expiry. Not defended against
  in v1 — would need a phone-home check against a trusted time source, which
  requires a backend and reintroduces an internet dependency for routine use.
- **Client-side enforcement in an Electron app is reversible** by a skilled
  reverse engineer (the renderer gate is just JS). The real backstop is the
  contract/relationship and the vendor's control over updates
  (`electron-updater`, already wired per §25.5), not binary protection.

### 27.3 Deliberately out of scope for v1
- A hosted license server for real-time revocation + offline grace period.
- Hardware/machine-fingerprint locking (to stop one license being copied to
  a second installation).
- Proxying the Gemini API key (§18.3) through a vendor-controlled backend —
  currently the raw key lives in the client's local `.env`/env var and is
  sent directly to Google per request. This is a real exposure (anyone with
  access to the machine or its network traffic can extract and reuse the
  key against the vendor's quota) but is independent of the licensing
  mechanism above and was explicitly deferred, not forgotten.

---

## Appendix A: File Structure (Current Web App)

```
src/
├── App.jsx                          # Router + auth wrapper
├── main.jsx                         # React entry point
├── index.css                        # Design tokens + Tailwind
├── api/
│   └── base44Client.js              # SDK initialization
├── lib/
│   ├── formatters.js                # formatPKR, generateInvoiceNumber, etc.
│   ├── utils.js                     # cn() utility
│   ├── AuthContext.jsx             # Auth provider
│   ├── authReturnTo.js              # Post-login redirect logic
│   ├── query-client.js              # React Query client
│   └── PageNotFound.jsx             # 404 page
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx            # Sidebar + main content wrapper
│   │   └── Sidebar.jsx              # Navigation sidebar
│   ├── shared/
│   │   ├── PageHeader.jsx           # Title + subtitle + actions
│   │   ├── StatCard.jsx             # KPI card
│   │   ├── SuccessNotification.jsx  # Alert banner
│   │   ├── FieldTip.jsx             # Label + tooltip
│   │   ├── NotificationProvider.jsx # Toast system
│   │   └── GlassTable.jsx           # Table wrapper
│   ├── products/
│   │   ├── ProductFormDialog.jsx    # Product add/edit modal
│   │   └── BarcodeScanner.jsx       # Barcode scanning
│   ├── stock/
│   │   ├── StockAdjustDialog.jsx    # Stock adjustment modal
│   │   └── StockHistoryDialog.jsx   # Movement history modal
│   ├── sales/
│   │   ├── SaleDetailDialog.jsx     # Invoice detail modal
│   │   └── SaleReturnDialog.jsx     # Return processing modal
│   ├── purchases/
│   │   └── PurchaseDetailDialog.jsx # PO detail modal
│   ├── ledger/
│   │   └── LedgerDialog.jsx         # Customer/supplier ledger
│   ├── ui/                          # shadcn/ui primitives (30+ files)
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── select.jsx
│   │   ├── dialog.jsx
│   │   ├── tabs.jsx
│   │   └── ... (many more)
│   ├── ProtectedRoute.jsx           # Auth guard
│   ├── AuthLayout.jsx              # Auth page layout
│   ├── GoogleIcon.jsx              # Google OAuth icon
│   ├── ScrollToTop.jsx             # Scroll restoration
│   └── UserNotRegisteredError.jsx  # Error page
├── pages/
│   ├── Home.jsx                     # Dashboard
│   ├── Products.jsx                 # Product catalog
│   ├── Stock.jsx                    # Stock management
│   ├── Sales.jsx                    # Sales list
│   ├── NewSale.jsx                  # Billing screen
│   ├── Purchases.jsx                # Purchase list
│   ├── NewPurchase.jsx              # New purchase/GRN
│   ├── Customers.jsx                # Customer management
│   ├── Suppliers.jsx                # Supplier management
│   ├── Payments.jsx                 # Payment log
│   ├── CreditAccounts.jsx           # Udhaar management
│   ├── Quotations.jsx               # Quotation list
│   ├── NewQuotation.jsx             # New quotation
│   ├── Expenses.jsx                 # Daily expenses
│   ├── Reports.jsx                  # Analytics & exports
│   ├── AIScanner.jsx                # AI invoice scanner
│   ├── Settings.jsx                 # Categories & brands
│   ├── Login.jsx                    # Login page
│   ├── Register.jsx                 # Registration page
│   ├── ForgotPassword.jsx           # Password reset request
│   └── ResetPassword.jsx            # Password reset form
└── utils/
    └── index.ts                    # Utility functions
```

---

## Appendix B: Installed NPM Packages

```
# Core
react ^18.2.0, react-dom ^18.2.0, react-router-dom ^6.26.0

# Styling
tailwindcss-animate ^1.0.7, class-variance-authority ^0.7.1, clsx ^2.1.1, tailwind-merge ^3.0.2

# UI (Radix primitives)
@radix-ui/react-* (20+ packages for shadcn/ui components)

# Icons
lucide-react ^0.475.0

# Charts
recharts ^2.15.4

# Date
moment ^2.30.1, date-fns ^3.6.0

# Forms
react-hook-form ^7.54.2, @hookform/resolvers ^4.1.2, zod ^3.24.2

# Data fetching
@tanstack/react-query ^5.84.1

# Rich text / markdown
react-quill ^2.0.0, react-markdown ^9.0.1

# Drag and drop
@hello-pangea/dnd ^17.0.0

# Maps
react-leaflet ^4.2.1

# 3D
three ^0.171.0

# PDF / Canvas
jspdf ^4.2.1, html2canvas ^1.4.1

# Notifications
sonner ^2.0.1, react-hot-toast ^2.6.0

# Other
cmdk ^1.0.0, input-otp ^1.4.2, canvas-confetti ^1.9.4
```

---

**End of PRD**

This document covers every functional aspect of the current Fazal Hardware application. Use it as the complete specification to rebuild on the Electron stack. The data model (Section 4), business logic (Section 22), and module specifications (Sections 6-19) are the most critical for implementation.