-- ===== Initial Settings =====
INSERT INTO settings (id, company_name, address, phone1, phone2, email, logo_path, currency_symbol, default_customer_id, invoice_footer, quotation_note, idle_logout_minutes, backup_dir, low_stock_alert, fiscal_year_start, updated_at)
VALUES (1, 'Fazal Plywood Store', 'Circular Road, Near Plywood Market, Pakistan', '+92 300 1234567', '+92 55 9876543', 'info@fazalplywood.com', NULL, 'Rs', 1, 'Thank you for shopping with us!', 'Prices valid for 7 days.', 30, NULL, 5, '07-01', datetime('now'));

-- ===== Default User Sequences =====
INSERT INTO doc_sequences (doc_type, next_no) VALUES ('sale', 1001);
INSERT INTO doc_sequences (doc_type, next_no) VALUES ('quotation', 2001);
INSERT INTO doc_sequences (doc_type, next_no) VALUES ('purchase', 3001);
INSERT INTO doc_sequences (doc_type, next_no) VALUES ('customer_payment', 4001);
INSERT INTO doc_sequences (doc_type, next_no) VALUES ('supplier_payment', 5001);

-- ===== Sample Users (Passwords: admin123, cashier123) =====
-- admin123 -> bcrypt hash below
-- cashier123 -> bcrypt hash below
INSERT INTO users (username, full_name, password_hash, role, override_pin_hash, is_active, last_login_at, created_at, updated_at)
VALUES 
('admin', 'Administrator', '$2a$10$209HnogR2FKCY9Wlo7LPG.Cffqnm3.4pfz/rTBAAgs2nouM02uCZ2', 'admin', '$2a$10$3gD0h/C2.zH1WeVn8lR0pe8f2g5d6s7a8s9d0f1g2h3j4k5l', 1, NULL, datetime('now'), datetime('now')),
('cashier', 'Senior Cashier', '$2a$10$2DNXgeQCHHbpaHPqwFKwW.zoAHhmC4p5sKeTLHe7KHCMhJDQruiJ2', 'cashier', NULL, 1, NULL, datetime('now'), datetime('now'));

-- ===== 18 Cities of Pakistan =====
INSERT INTO cities (name) VALUES ('Faisalabad');
INSERT INTO cities (name) VALUES ('Gujrat');
INSERT INTO cities (name) VALUES ('Wazirabad');
INSERT INTO cities (name) VALUES ('Kharian');
INSERT INTO cities (name) VALUES ('Jhelum');
INSERT INTO cities (name) VALUES ('Rawalpindi');
INSERT INTO cities (name) VALUES ('Sahiwal');
INSERT INTO cities (name) VALUES ('Multan');
INSERT INTO cities (name) VALUES ('Bahawalpur');
INSERT INTO cities (name) VALUES ('Sheikhupura');
INSERT INTO cities (name) VALUES ('Karachi');
INSERT INTO cities (name) VALUES ('Lahore');
INSERT INTO cities (name) VALUES ('Gujranwala');
INSERT INTO cities (name) VALUES ('Peshawar');
INSERT INTO cities (name) VALUES ('Quetta');
INSERT INTO cities (name) VALUES ('Islamabad');
INSERT INTO cities (name) VALUES ('Sialkot');
INSERT INTO cities (name) VALUES ('Sargodha');

-- ===== Default Customers =====
-- Default customer: Walk-in Customer (Must have ID 1 to match default_customer_id)
INSERT INTO customers (id, name, father_name, contact_person, phone, mobile, fax, email, city_id, address, cnic, opening_balance, credit_limit, is_club_member, loyalty_points, picture_path, is_active, deleted_at, created_at, updated_at)
VALUES (1, 'Walk-in Customer', NULL, NULL, NULL, NULL, NULL, NULL, 13, 'Shop Counter', NULL, 0, 0, 0, 0, NULL, 1, NULL, datetime('now'), datetime('now'));

INSERT INTO customers (name, father_name, contact_person, phone, mobile, fax, email, city_id, address, cnic, opening_balance, credit_limit, is_club_member, loyalty_points, picture_path, is_active, deleted_at, created_at, updated_at)
VALUES 
('New Lucky Traders', 'Muhammad Ali', 'Ali Raza', '055-1234567', '0300-7654321', NULL, 'lucky@gmail.com', 13, 'G.T Road, Gujranwala', '34101-1234567-1', 2500000, 50000000, 1, 120, NULL, 1, NULL, datetime('now'), datetime('now')),
('Hamza Plywood', 'Tariq Mahmood', 'Hamza Tariq', '042-3588990', '0321-1122334', NULL, 'hamzaply@yahoo.com', 12, 'Peco Road, Lahore', '35202-9876543-1', 0, 100000000, 0, 0, NULL, 1, NULL, datetime('now'), datetime('now')),
('Gulzar Traders', 'Gulzar Ahmad', 'Bilal Gulzar', '053-998877', '0315-9998887', NULL, 'gulzar@hotmail.com', 2, 'Kutchery Road, Gujrat', '34201-1111111-1', -1500000, 20000000, 0, 0, NULL, 1, NULL, datetime('now'), datetime('now'));

-- ===== Default Suppliers =====
INSERT INTO suppliers (name, contact_person, phone, mobile, fax, email, address, opening_balance, is_active, deleted_at, created_at, updated_at)
VALUES 
('Sadaqat Plywood Industries', 'Sadaqat Khan', '041-987654', '0300-8889990', NULL, 'sadaqat@plywood.com', 'Sargodha Road, Faisalabad', 12000000, 1, NULL, datetime('now'), datetime('now')),
('National Hardware Co', 'Sohail Ahmad', '021-3456789', '0333-1112223', NULL, 'sales@nationalhw.com', 'Timber Market, Karachi', 0, 1, NULL, datetime('now'), datetime('now')),
('Diamond Veneers & MDF', 'Pervaiz Elahi', '042-765432', '0322-4445556', NULL, 'info@diamondveneer.com', 'Changa Manga Road, Lahore', 4500000, 1, NULL, datetime('now'), datetime('now'));

-- ===== Product Categories =====
INSERT INTO categories (name, default_margin_percent) VALUES ('Commercial Plywood', 15.0);
INSERT INTO categories (name, default_margin_percent) VALUES ('Fancy Veneer Sheets', 20.0);
INSERT INTO categories (name, default_margin_percent) VALUES ('MDF & Lasani Boards', 12.0);
INSERT INTO categories (name, default_margin_percent) VALUES ('Door Handles & Locks', 25.0);
INSERT INTO categories (name, default_margin_percent) VALUES ('Hardware Hinges', 18.0);
INSERT INTO categories (name, default_margin_percent) VALUES ('Adhesives & Paints', 10.0);

-- ===== Product Colors =====
INSERT INTO colors (name, note) VALUES ('Natural Oak', 'Classic oak texture');
INSERT INTO colors (name, note) VALUES ('Walnut Dark', 'Rich dark walnut finish');
INSERT INTO colors (name, note) VALUES ('Matt Silver', 'Hardware brushed metal');
INSERT INTO colors (name, note) VALUES ('Golden Glow', 'Bright brass finish');
INSERT INTO colors (name, note) VALUES ('Pure White', 'Glossy MDF sheet');

-- ===== Product Seeds (Around 30 Products) =====
-- prices are in paisa. e.g. Rs 4,500 = 450000 paisa.
-- Cut-to-size products: unit = 'sheet' or 'sqft' and is_cut_to_size = 1.
-- Per-piece products: unit = 'pcs' and is_cut_to_size = 0.
INSERT INTO products (code, name, category_id, supplier_id, color_id, unit, pack_size, is_cut_to_size, purchase_price, sale_price, min_price, default_length, default_width, reorder_level, opening_stock, current_stock, created_at, updated_at)
VALUES 
-- Category 1: Commercial Plywood (Cut to Size)
('PLY-COMM-4MM', 'Commercial Plywood 4mm', 1, 1, 1, 'sheet', '1 Sheet', 1, 180000, 210000, 200000, 8.0, 4.0, 50, 100, 100, datetime('now'), datetime('now')),
('PLY-COMM-8MM', 'Commercial Plywood 8mm', 1, 1, 1, 'sheet', '1 Sheet', 1, 260000, 310000, 290000, 8.0, 4.0, 40, 80, 80, datetime('now'), datetime('now')),
('PLY-COMM-12MM', 'Commercial Plywood 12mm', 1, 1, 1, 'sheet', '1 Sheet', 1, 380000, 450000, 420000, 8.0, 4.0, 30, 50, 50, datetime('now'), datetime('now')),
('PLY-COMM-18MM', 'Commercial Plywood 18mm', 1, 1, 1, 'sheet', '1 Sheet', 1, 520000, 620000, 580000, 8.0, 4.0, 20, 40, 40, datetime('now'), datetime('now')),

-- Category 2: Fancy Veneer Sheets (Cut to Size)
('VEN-OAK-4MM', 'Ash Oak Veneer Sheet 4mm', 2, 3, 1, 'sheet', '1 Sheet', 1, 350000, 420000, 390000, 8.0, 4.0, 25, 30, 30, datetime('now'), datetime('now')),
('VEN-WAL-4MM', 'Walnut Veneer Sheet 4mm', 2, 3, 2, 'sheet', '1 Sheet', 1, 380000, 460000, 430000, 8.0, 4.0, 25, 25, 25, datetime('now'), datetime('now')),
('VEN-TEAK-4MM', 'Burma Teak Veneer Sheet 4mm', 2, 3, 1, 'sheet', '1 Sheet', 1, 420000, 510000, 470000, 8.0, 4.0, 15, 20, 20, datetime('now'), datetime('now')),

-- Category 3: MDF & Lasani Boards (Cut to Size)
('MDF-PWT-18MM', 'MDF Pure White 18mm Double Face', 3, 3, 5, 'sheet', '1 Sheet', 1, 550000, 640000, 610000, 8.0, 4.0, 30, 60, 60, datetime('now'), datetime('now')),
('MDF-OAK-18MM', 'MDF Oak Texture 18mm', 3, 3, 1, 'sheet', '1 Sheet', 1, 580000, 680000, 640000, 8.0, 4.0, 20, 40, 40, datetime('now'), datetime('now')),
('MDF-WAL-18MM', 'MDF Walnut Texture 18mm', 3, 3, 2, 'sheet', '1 Sheet', 1, 600000, 710000, 670000, 8.0, 4.0, 20, 30, 30, datetime('now'), datetime('now')),
('LAS-BEG-12MM', 'Lasani Beige 12mm Single Face', 3, 3, 5, 'sheet', '1 Sheet', 1, 410000, 480000, 450000, 8.0, 4.0, 25, 45, 45, datetime('now'), datetime('now')),

-- Category 4: Door Handles & Locks (Per Piece)
('LOC-MORT-GLD', 'Mortise Door Lock Golden Premium', 4, 2, 4, 'pcs', '1 Box', 0, 250000, 350000, 310000, NULL, NULL, 15, 35, 35, datetime('now'), datetime('now')),
('LOC-MORT-SLV', 'Mortise Door Lock Silver Matt', 4, 2, 3, 'pcs', '1 Box', 0, 220000, 310000, 280000, NULL, NULL, 15, 40, 40, datetime('now'), datetime('now')),
('LOC-CYL-STD', 'Standard Cylindrical Brass Lock', 4, 2, 4, 'pcs', '1 Box', 0, 95000, 135000, 120000, NULL, NULL, 30, 75, 75, datetime('now'), datetime('now')),
('HDL-GATE-12IN', 'Gate Handle Stainless Steel 12-inch', 4, 2, 3, 'pcs', 'Pair', 0, 80000, 115000, 100000, NULL, NULL, 20, 50, 50, datetime('now'), datetime('now')),
('HDL-GATE-8IN', 'Gate Handle Stainless Steel 8-inch', 4, 2, 3, 'pcs', 'Pair', 0, 55000, 78000, 70000, NULL, NULL, 20, 60, 60, datetime('now'), datetime('now')),
('HDL-CAB-MATT', 'Cabinet Pull Handle Matt Black 6in', 4, 2, 3, 'pcs', '10 pcs/pk', 0, 15000, 25000, 22000, NULL, NULL, 100, 250, 250, datetime('now'), datetime('now')),

-- Category 5: Hardware Hinges (Per Piece)
('HNG-HYD-SS', 'Hydraulic Cabinet Hinge SS 3D', 5, 2, 3, 'pcs', 'Pair', 0, 18000, 28000, 24000, NULL, NULL, 150, 400, 400, datetime('now'), datetime('now')),
('HNG-NORM-SS', 'Normal Cabinet Hinge Stainless Steel', 5, 2, 3, 'pcs', 'Pair', 0, 8000, 13000, 11000, NULL, NULL, 200, 600, 600, datetime('now'), datetime('now')),
('HNG-BUTT-4IN', 'Butt Hinge Heavy Duty 4x3x3 SS', 5, 2, 3, 'pcs', 'Pair', 0, 35000, 52000, 46000, NULL, NULL, 50, 120, 120, datetime('now'), datetime('now')),
('HNG-BUTT-3IN', 'Butt Hinge SS 3x2.5x2', 5, 2, 3, 'pcs', 'Pair', 0, 22000, 33000, 29000, NULL, NULL, 80, 180, 180, datetime('now'), datetime('now')),

-- Category 6: Adhesives & Paints (Per Piece)
('ADH-WOOD-1KG', 'Wood Glue Premium PVA 1kg German', 6, 2, 5, 'pcs', '1 Can', 0, 45000, 58000, 54000, NULL, NULL, 50, 90, 90, datetime('now'), datetime('now')),
('ADH-WOOD-5KG', 'Wood Glue Premium PVA 5kg German', 6, 2, 5, 'pcs', '1 Tub', 0, 190000, 245000, 225000, NULL, NULL, 10, 24, 24, datetime('now'), datetime('now')),
('ADH-SR-3KG', 'Super Glue SR Contact Adhesive 3kg', 6, 2, 5, 'pcs', '1 Tub', 0, 165000, 210000, 195000, NULL, NULL, 12, 30, 30, datetime('now'), datetime('now')),
('PNT-CL-LACR', 'Clear Wood Lacquer Glossy 1 Liter', 6, 2, 5, 'pcs', '1 Can', 0, 65000, 85000, 78000, NULL, NULL, 20, 45, 45, datetime('now'), datetime('now')),
('PNT-TH-1LTR', 'Lacquer Thinner Premium 1 Liter', 6, 2, 5, 'pcs', '1 Can', 0, 28000, 38000, 34000, NULL, NULL, 40, 80, 80, datetime('now'), datetime('now'));

-- ===== Initial opening stock entries into stock_ledger =====
-- Seed stock for PLY-COMM-4MM
INSERT INTO stock_ledger (product_id, doc_date, doc_type, doc_id, doc_no, qty_in, qty_out, rate, length, width, balance_after, remarks, created_at)
SELECT id, '2026-06-01', 'opening', NULL, NULL, 100.0, 0.0, purchase_price, default_length, default_width, 100.0, 'Seed opening stock', datetime('now') FROM products WHERE code = 'PLY-COMM-4MM';

-- Seed stock for LOC-MORT-GLD
INSERT INTO stock_ledger (product_id, doc_date, doc_type, doc_id, doc_no, qty_in, qty_out, rate, length, width, balance_after, remarks, created_at)
SELECT id, '2026-06-01', 'opening', NULL, NULL, 35.0, 0.0, purchase_price, NULL, NULL, 35.0, 'Seed opening stock', datetime('now') FROM products WHERE code = 'LOC-MORT-GLD';

-- ===== Initial opening balances in party_ledger =====
-- New Lucky Traders (Customer owes us Rs 25,000 = 2500000 paisa)
INSERT INTO party_ledger (party_type, party_id, doc_date, doc_type, doc_id, doc_no, debit, credit, balance_after, remarks, created_at)
VALUES ('customer', 2, '2026-06-01', 'opening', NULL, NULL, 2500000, 0, 2500000, 'Legacy opening balance', datetime('now'));

-- Gulzar Traders (We owe Customer/Supplier Rs 15,000 = -1500000 balance_after, showing negative customer balance means they paid in advance or return credit)
INSERT INTO party_ledger (party_type, party_id, doc_date, doc_type, doc_id, doc_no, debit, credit, balance_after, remarks, created_at)
VALUES ('customer', 4, '2026-06-01', 'opening', NULL, NULL, 0, 1500000, -1500000, 'Legacy opening advance', datetime('now'));

-- Sadaqat Plywood (We owe Supplier Rs 120,000 = 12000000 paisa)
INSERT INTO party_ledger (party_type, party_id, doc_date, doc_type, doc_id, doc_no, debit, credit, balance_after, remarks, created_at)
VALUES ('supplier', 1, '2026-06-01', 'opening', NULL, NULL, 0, 12000000, 12000000, 'Legacy opening balance', datetime('now'));

-- Diamond Veneers (We owe Supplier Rs 45,000 = 4500000 paisa)
INSERT INTO party_ledger (party_type, party_id, doc_date, doc_type, doc_id, doc_no, debit, credit, balance_after, remarks, created_at)
VALUES ('supplier', 3, '2026-06-01', 'opening', NULL, NULL, 0, 4500000, 4500000, 'Legacy opening balance', datetime('now'));
