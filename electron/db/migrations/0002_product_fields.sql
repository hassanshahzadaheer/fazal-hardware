-- Client-requested Product screen fields (meeting 2026-11-09).
ALTER TABLE products ADD COLUMN product_code TEXT;
ALTER TABLE products ADD COLUMN color TEXT;
ALTER TABLE products ADD COLUMN packing_size TEXT;
ALTER TABLE products ADD COLUMN min_sale_price REAL;
ALTER TABLE products ADD COLUMN length REAL;
ALTER TABLE products ADD COLUMN width REAL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code) WHERE product_code IS NOT NULL
