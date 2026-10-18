-- Phase 1 schema per docs/Fazal_Hardware_PRD.md §4 (Task 1.1).
-- Entity tables follow the PRD field lists; created_date/updated_date default to
-- SQLite datetime('now') rather than app-supplied timestamps.

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  brand_id INTEGER REFERENCES brands(id),
  variant_attributes TEXT,
  base_unit TEXT NOT NULL,
  purchase_unit TEXT,
  purchase_unit_factor REAL,
  retail_price REAL,
  wholesale_price REAL,
  cost_price REAL,
  reorder_level REAL,
  rack_location TEXT,
  barcode TEXT,
  stock_on_hand REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  type TEXT,
  address TEXT,
  balance REAL NOT NULL DEFAULT 0,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  balance REAL NOT NULL DEFAULT 0,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  remarks TEXT,
  items TEXT,
  subtotal REAL,
  discount_amount REAL DEFAULT 0,
  freight_amount REAL DEFAULT 0,
  total REAL,
  status TEXT NOT NULL DEFAULT 'draft',
  converted_to_invoice_id INTEGER,
  valid_until TEXT,
  notes TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS sale_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  items TEXT,
  subtotal REAL,
  discount_amount REAL DEFAULT 0,
  freight_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  payment_mode TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  price_tier TEXT NOT NULL DEFAULT 'retail',
  quotation_id INTEGER REFERENCES quotations(id),
  notes TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_name TEXT,
  items TEXT,
  subtotal REAL,
  freight_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  payment_mode TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  notes TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  cost_price_at_time REAL,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_type TEXT NOT NULL,
  party_id INTEGER NOT NULL,
  party_name TEXT,
  amount REAL NOT NULL,
  direction TEXT NOT NULL,
  mode TEXT NOT NULL,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  expense_head TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_id INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-row company info used by print templates (invoice/quotation/statement/report
-- headers), added so "Fazal Hardware" isn't hardcoded across every template.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Fazal Hardware',
  address TEXT,
  phone TEXT,
  email TEXT,
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Generic sequential-counter table backing document numbers (invoice/PO/quotation),
-- per the plan's decision to avoid random-suffix collision risk.
CREATE TABLE IF NOT EXISTS doc_sequences (
  doc_type TEXT PRIMARY KEY,
  current_value INTEGER NOT NULL DEFAULT 0
);

INSERT INTO settings (id, company_name) VALUES (1, 'Fazal Hardware');

INSERT INTO doc_sequences (doc_type, current_value) VALUES ('sale_invoice', 0);
INSERT INTO doc_sequences (doc_type, current_value) VALUES ('purchase_order', 0);
INSERT INTO doc_sequences (doc_type, current_value) VALUES ('quotation', 0);
