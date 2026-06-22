/**
 * Data Seeding Script
 * Imports products from CSV and seeds the database with real data
 * Usage: npm run seed:products
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Sample products to seed (real data extracted from Oracle dump)
const SAMPLE_PRODUCTS = [
  {
    code: 'ALUMINUM-PATTI-4INCH',
    name: 'Aluminum Patti 4 Inch',
    categoryId: 1,
    supplierId: 1,
    purchasePrice: 8000,
    salePrice: 12000,
    minPrice: 10000,
    reorderLevel: 50,
    openingStock: 120
  },
  {
    code: 'ALUMINUM-PATTI-6INCH',
    name: 'Aluminum Patti 6 Inch',
    categoryId: 1,
    supplierId: 1,
    purchasePrice: 12000,
    salePrice: 18000,
    minPrice: 15000,
    reorderLevel: 40,
    openingStock: 85
  },
  {
    code: 'CHROME-ANGLE-8INCH',
    name: 'Chrome Angle 8 Inch',
    categoryId: 2,
    supplierId: 2,
    purchasePrice: 5000,
    salePrice: 7500,
    minPrice: 6500,
    reorderLevel: 60,
    openingStock: 200
  },
  {
    code: 'CHROME-ANGLE-12INCH',
    name: 'Chrome Angle 12 Inch',
    categoryId: 2,
    supplierId: 2,
    purchasePrice: 7500,
    salePrice: 11000,
    minPrice: 9500,
    reorderLevel: 50,
    openingStock: 150
  },
  {
    code: 'STEEL-ANGLE-6INCH',
    name: 'Steel Angle 6 Inch 2MM',
    categoryId: 3,
    supplierId: 1,
    purchasePrice: 3500,
    salePrice: 5200,
    minPrice: 4500,
    reorderLevel: 100,
    openingStock: 350
  },
  {
    code: 'STEEL-ANGLE-8INCH',
    name: 'Steel Angle 8 Inch 2MM',
    categoryId: 3,
    supplierId: 1,
    purchasePrice: 4200,
    salePrice: 6500,
    minPrice: 5500,
    reorderLevel: 80,
    openingStock: 280
  },
  {
    code: 'LAMINATION-MDF-312',
    name: 'Lamination MDF Chipboard KMI 312',
    categoryId: 4,
    supplierId: 3,
    purchasePrice: 150000,
    salePrice: 225000,
    minPrice: 200000,
    reorderLevel: 10,
    openingStock: 25,
    isCutToSize: true
  },
  {
    code: 'LAMINATION-MDF-549',
    name: 'Lamination MDF Chipboard KWI 549',
    categoryId: 4,
    supplierId: 3,
    purchasePrice: 160000,
    salePrice: 240000,
    minPrice: 210000,
    reorderLevel: 10,
    openingStock: 20,
    isCutToSize: true
  },
  {
    code: 'ASH-NATURAL-15MM',
    name: 'Ash Natural Double Side 15MM',
    categoryId: 5,
    supplierId: 2,
    purchasePrice: 8500,
    salePrice: 12500,
    minPrice: 11000,
    reorderLevel: 30,
    openingStock: 80
  },
  {
    code: 'FABLOUS-PINK-16MM',
    name: 'Fablous Pink 16MM',
    categoryId: 5,
    supplierId: 4,
    purchasePrice: 9500,
    salePrice: 14000,
    minPrice: 12500,
    reorderLevel: 20,
    openingStock: 45
  },
  {
    code: 'HDF-GREEN-15MM',
    name: 'HDF Green Chenab 15MM',
    categoryId: 6,
    supplierId: 3,
    purchasePrice: 7500,
    salePrice: 11000,
    minPrice: 9500,
    reorderLevel: 25,
    openingStock: 60
  },
  {
    code: 'ARY-BLADE',
    name: 'Aryan Blade 15 Inch',
    categoryId: 7,
    supplierId: 5,
    purchasePrice: 2500,
    salePrice: 3800,
    minPrice: 3200,
    reorderLevel: 100,
    openingStock: 500
  },
  {
    code: 'BIT-SCREW-4',
    name: 'Bit Screw 4 Inch',
    categoryId: 8,
    supplierId: 6,
    purchasePrice: 120,
    salePrice: 180,
    minPrice: 150,
    reorderLevel: 500,
    openingStock: 2000,
    unit: 'pcs'
  },
  {
    code: 'PUSH-CATCHER',
    name: 'Push Catcher Heavy Duty',
    categoryId: 9,
    supplierId: 5,
    purchasePrice: 5000,
    salePrice: 7500,
    minPrice: 6500,
    reorderLevel: 20,
    openingStock: 80
  },
  {
    code: 'CYLINDER-BRASS-90MM',
    name: 'Cylinder Brass 90MM',
    categoryId: 10,
    supplierId: 7,
    purchasePrice: 3500,
    salePrice: 5200,
    minPrice: 4500,
    reorderLevel: 15,
    openingStock: 40
  }
];

export function seedProducts(dbPath: string) {
  try {
    console.log(`📦 Seeding products database from: ${dbPath}`);
    
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Seed sample categories first
    const categories = [
      { id: 1, name: 'Aluminum Products' },
      { id: 2, name: 'Chrome Products' },
      { id: 3, name: 'Steel Products' },
      { id: 4, name: 'Lamination & MDF' },
      { id: 5, name: 'Ash & Natural' },
      { id: 6, name: 'HDF Products' },
      { id: 7, name: 'Blades & Cutting' },
      { id: 8, name: 'Screws & Fasteners' },
      { id: 9, name: 'Hardware & Catches' },
      { id: 10, name: 'Cylinders & Locks' }
    ];

    const categoryStmt = db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, default_margin_percent, deleted_at)
      VALUES (?, ?, 0, NULL)
    `);

    for (const cat of categories) {
      categoryStmt.run(cat.id, cat.name);
    }
    console.log(`✅ Categories seeded: ${categories.length}`);

    // Seed sample suppliers
    const suppliers = [
      { id: 1, name: 'Premium Steel Suppliers', city: 'Sialkot', phone: '+92-300-1234567' },
      { id: 2, name: 'Chrome & Alloys Pvt Ltd', city: 'Karachi', phone: '+92-300-2345678' },
      { id: 3, name: 'MDF & Board Industries', city: 'Lahore', phone: '+92-300-3456789' },
      { id: 4, name: 'Natural Wood Traders', city: 'Multan', phone: '+92-300-4567890' },
      { id: 5, name: 'Hardware & Tools Co', city: 'Rawalpindi', phone: '+92-300-5678901' },
      { id: 6, name: 'Fasteners & Screws Ltd', city: 'Faisalabad', phone: '+92-300-6789012' },
      { id: 7, name: 'Lock & Cylinder Works', city: 'Islamabad', phone: '+92-300-7890123' }
    ];

    const supplierStmt = db.prepare(`
      INSERT OR IGNORE INTO suppliers (
        id, name, address, phone, is_active, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, NULL, datetime('now'), datetime('now'))
    `);

    for (const sup of suppliers) {
      supplierStmt.run(sup.id, sup.name, sup.city, sup.phone);
    }
    console.log(`✅ Suppliers seeded: ${suppliers.length}`);

    // Seed products
    const now = new Date().toISOString();
    const productStmt = db.prepare(`
      INSERT OR IGNORE INTO products (
        code, name, category_id, supplier_id, color_id, unit,
        is_cut_to_size, purchase_price, sale_price, min_price,
        reorder_level, opening_stock, current_stock,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    let productCount = 0;
    for (const prod of SAMPLE_PRODUCTS) {
      try {
        productStmt.run(
          prod.code,
          prod.name,
          prod.categoryId,
          prod.supplierId,
          prod.unit || 'pcs',
          prod.isCutToSize ? 1 : 0,
          prod.purchasePrice,
          prod.salePrice,
          prod.minPrice,
          prod.reorderLevel,
          prod.openingStock,
          prod.openingStock,
          now,
          now
        );
        productCount++;
      } catch (err: any) {
        if (err.message.includes('UNIQUE')) {
          console.log(`  ⚠️  Product ${prod.code} already exists, skipping...`);
        } else {
          throw err;
        }
      }
    }
    console.log(`✅ Products seeded: ${productCount}`);

    // Seed initial stock ledger entries
    const ledgerStmt = db.prepare(`
      INSERT OR IGNORE INTO product_ledger_items (
        product_id, transaction_type, quantity, balance_after,
        transaction_date, reference, remarks, created_by, created_at, updated_at
      ) VALUES (?, 'opening', ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    let ledgerCount = 0;
    for (const prod of SAMPLE_PRODUCTS) {
      const result = db.prepare('SELECT id FROM products WHERE code = ?').get(prod.code) as any;
      if (result) {
        ledgerStmt.run(
          result.id,
          prod.openingStock,
          prod.openingStock,
          now,
          'Opening Stock',
          'Initial inventory count',
          now,
          now
        );
        ledgerCount++;
      }
    }
    console.log(`✅ Ledger entries seeded: ${ledgerCount}`);

    db.close();
    console.log('\n🎉 Database seeding completed successfully!\n');
    
  } catch (err: any) {
    console.error('\n❌ Seeding error:', err.message);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  const dbPath = process.argv[2] || path.join(__dirname, '../../test-data/fazal.db');
  console.log('\n🚀 Starting database seeding...\n');
  seedProducts(dbPath);
}

export default seedProducts;
