-- ===== System tables =====


CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Fazal Plywood Store',
  address TEXT,
  phone1 TEXT,
  phone2 TEXT,
  email TEXT,
  logo_path TEXT,
  currency_symbol TEXT NOT NULL DEFAULT 'Rs',
  default_customer_id INTEGER,
  invoice_footer TEXT,
  quotation_note TEXT,
  idle_logout_minutes INTEGER NOT NULL DEFAULT 30,
  backup_dir TEXT,
  low_stock_alert INTEGER NOT NULL DEFAULT 1,
  fiscal_year_start TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','cashier','storekeeper','accountant')),
  override_pin_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  default_margin_percent REAL DEFAULT 0,
  loyalty_points_per REAL DEFAULT 0,
  loyalty_point_value REAL DEFAULT 0,
  deleted_at TEXT
);

CREATE TABLE colors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  note TEXT,
  deleted_at TEXT
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  email TEXT,
  address TEXT,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  father_name TEXT,
  contact_person TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  email TEXT,
  city_id INTEGER REFERENCES cities(id),
  address TEXT,
  cnic TEXT,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER NOT NULL DEFAULT 0,
  is_club_member INTEGER NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  picture_path TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE carpenters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  deleted_at TEXT
);

CREATE TABLE delivery_men (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT,
  deleted_at TEXT
);

CREATE TABLE expense_heads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE doc_sequences (
  doc_type TEXT PRIMARY KEY,
  next_no INTEGER NOT NULL
);

-- ===== Products =====
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  color_id INTEGER REFERENCES colors(id),
  unit TEXT NOT NULL DEFAULT 'pcs' CHECK (unit IN ('pcs','sheet','sqft','rft','kg','set')),
  pack_size TEXT,
  is_cut_to_size INTEGER NOT NULL DEFAULT 0,
  purchase_price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER NOT NULL DEFAULT 0,
  min_price INTEGER NOT NULL DEFAULT 0,
  default_length REAL,
  default_width REAL,
  reorder_level REAL NOT NULL DEFAULT 0,
  opening_stock REAL NOT NULL DEFAULT 0,
  current_stock REAL NOT NULL DEFAULT 0,
  picture_path TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category_id);

-- ===== Quotations =====
CREATE TABLE quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  reference TEXT,
  cell_no TEXT,
  gross_value INTEGER NOT NULL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  freight INTEGER DEFAULT 0,
  net_value INTEGER NOT NULL DEFAULT 0,
  valid_until TEXT,
  converted_invoice_id INTEGER, -- Added after sale_invoices exists or as nullable integer without explicit FK to prevent circular dependency
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE quotation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  length REAL,
  width REAL,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  remarks TEXT
);

-- ===== Invoices =====
CREATE TABLE sale_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  salesman_id INTEGER REFERENCES users(id),
  carpenter_id INTEGER REFERENCES carpenters(id),
  quotation_id INTEGER REFERENCES quotations(id),
  reference TEXT,
  cell_no TEXT,
  cnic TEXT,
  driver TEXT,
  gross_value INTEGER NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  freight INTEGER NOT NULL DEFAULT 0,
  net_value INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  payment_mode TEXT CHECK (payment_mode IN ('cash','credit','card','bank','cheque','mixed')),
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','void')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sales_date ON sale_invoices(doc_date);
CREATE INDEX idx_sales_customer ON sale_invoices(customer_id);

CREATE TABLE sale_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES sale_invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  length REAL,
  width REAL,
  unit_price INTEGER NOT NULL,
  sale_type TEXT,
  line_total INTEGER NOT NULL,
  cost_price INTEGER NOT NULL DEFAULT 0,
  remarks TEXT
);
CREATE INDEX idx_sale_items_invoice ON sale_invoice_items(invoice_id);
CREATE INDEX idx_sale_items_product ON sale_invoice_items(product_id);

-- ===== Purchases =====
CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_invoice_ref TEXT,
  gross_value INTEGER NOT NULL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  freight INTEGER DEFAULT 0,
  net_value INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  payment_mode TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','void')),
  created_by INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  length REAL,
  width REAL,
  unit_cost INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  remarks TEXT
);

-- ===== Returns =====
CREATE TABLE sale_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  original_invoice_id INTEGER REFERENCES sale_invoices(id),
  net_value INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE sale_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty REAL NOT NULL,
  length REAL,
  width REAL,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL
);

CREATE TABLE purchase_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  net_value INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE purchase_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty REAL NOT NULL,
  length REAL,
  width REAL,
  unit_cost INTEGER NOT NULL,
  line_total INTEGER NOT NULL
);

-- ===== Stock & money ledgers =====
CREATE TABLE stock_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  doc_date TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('opening','sale','sale_return','purchase','purchase_return','adjustment')),
  doc_id INTEGER,
  doc_no INTEGER,
  qty_in REAL NOT NULL DEFAULT 0,
  qty_out REAL NOT NULL DEFAULT 0,
  rate INTEGER NOT NULL DEFAULT 0,
  length REAL,
  width REAL,
  balance_after REAL NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_stock_ledger_product ON stock_ledger(product_id, doc_date);

CREATE TABLE party_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_type TEXT NOT NULL CHECK (party_type IN ('customer','supplier')),
  party_id INTEGER NOT NULL,
  doc_date TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('opening','sale','sale_return','purchase','purchase_return','receipt','payment','adjustment')),
  doc_id INTEGER,
  doc_no INTEGER,
  debit INTEGER NOT NULL DEFAULT 0,
  credit INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_party_ledger ON party_ledger(party_type, party_id, doc_date);

-- ===== Payments =====
CREATE TABLE customer_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  amount INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cash','cheque','bank','card')),
  cheque_no TEXT,
  cheque_date TEXT,
  bank TEXT,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_no INTEGER NOT NULL UNIQUE,
  doc_date TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  amount INTEGER NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cash','cheque','bank','card')),
  cheque_no TEXT,
  cheque_date TEXT,
  bank TEXT,
  remarks TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

-- ===== Expenses =====
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_date TEXT NOT NULL,
  head_id INTEGER REFERENCES expense_heads(id),
  description TEXT,
  amount INTEGER NOT NULL,
  mode TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);

-- ===== Audit Log =====
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  details_json TEXT,
  created_at TEXT NOT NULL
);
