// Seeds the dev database with realistic demo data so the app can be clicked
// through end-to-end. Run with: npx tsx scripts/seed-demo-data.ts
// Uses the real handler functions (not raw SQL) so every insert goes through
// the same validation/business logic as the running app (stock movements,
// sequence numbers, balance updates, etc.)
import * as path from 'path';
import { initDb, getDb } from '../electron/db';
import * as categoriesHandler from '../electron/handlers/categories';
import * as brandsHandler from '../electron/handlers/brands';
import * as productsHandler from '../electron/handlers/products';
import * as customersHandler from '../electron/handlers/customers';
import * as suppliersHandler from '../electron/handlers/suppliers';
import * as purchasesHandler from '../electron/handlers/purchases';
import * as salesHandler from '../electron/handlers/sales';
import * as paymentsHandler from '../electron/handlers/payments';
import * as quotationsHandler from '../electron/handlers/quotations';
import * as expensesHandler from '../electron/handlers/expenses';

// `npm run dev` runs the real Electron app, whose `app.getPath('userData')`
// resolves to the OS-standard per-app data dir (on macOS:
// ~/Library/Application Support/<package.json name>). This script runs under
// plain Node (no Electron runtime), so it targets that exact same path
// directly rather than relying on electron/db/index.ts's no-Electron fallback
// (which points at a different, test-only directory).
const dbPath =
  process.env.FAZAL_DB_PATH ??
  path.join(
    process.platform === 'darwin'
      ? path.join(process.env.HOME!, 'Library', 'Application Support', 'fazal-pos-inventory')
      : process.platform === 'win32'
      ? path.join(process.env.APPDATA!, 'fazal-pos-inventory')
      : path.join(process.env.HOME!, '.config', 'fazal-pos-inventory'),
    'fazal.db'
  );

function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: { code: string; message: string } }, label: string): T {
  if (!result.ok) {
    throw new Error(`${label} failed: ${result.error.code} ${result.error.message}`);
  }
  return result.data;
}

async function main() {
  initDb(dbPath);
  const db = getDb();

  console.log(`Seeding ${dbPath} ...`);

  // --- Categories & Brands ---
  const categoryNames = ['Hand Tools', 'Power Tools', 'Fasteners', 'Paint & Chemicals', 'Pipes & Fittings', 'Electrical'];
  const categories = categoryNames.map((name) => unwrap(categoriesHandler.create(db, { name }), `category ${name}`));

  const brandNames = ['Bosch', 'Stanley', 'Dewalt', 'Asian Paints', 'Local'];
  const brands = brandNames.map((name) => unwrap(brandsHandler.create(db, { name }), `brand ${name}`));

  // --- Products ---
  const productDefs = [
    { name: 'Claw Hammer 16oz', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 850, wholesalePrice: 750, costPrice: 600, reorderLevel: 10, barcode: '8900001' },
    { name: 'Adjustable Wrench 10"', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 650, wholesalePrice: 550, costPrice: 420, reorderLevel: 8, barcode: '8900002' },
    { name: 'Cordless Drill 18V', category: 'Power Tools', brand: 'Bosch', baseUnit: 'piece', retailPrice: 12500, wholesalePrice: 11200, costPrice: 9000, reorderLevel: 3, barcode: '8900003' },
    { name: 'Angle Grinder 4"', category: 'Power Tools', brand: 'Dewalt', baseUnit: 'piece', retailPrice: 8900, wholesalePrice: 7900, costPrice: 6500, reorderLevel: 4, barcode: '8900004' },
    { name: 'Wood Screws 1" (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 180, wholesalePrice: 150, costPrice: 110, reorderLevel: 20, barcode: '8900005' },
    { name: 'Hex Bolts M8x50 (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 320, wholesalePrice: 280, costPrice: 220, reorderLevel: 15, barcode: '8900006' },
    { name: 'Weather Shield Paint 4L', category: 'Paint & Chemicals', brand: 'Asian Paints', baseUnit: 'piece', retailPrice: 3200, wholesalePrice: 2900, costPrice: 2300, reorderLevel: 6, barcode: '8900007' },
    { name: 'PVC Pipe 1" (20ft)', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 950, wholesalePrice: 820, costPrice: 650, reorderLevel: 12, barcode: '8900008' },
    { name: 'Elbow Joint 1"', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 45, wholesalePrice: 35, costPrice: 20, reorderLevel: 50, barcode: '8900009' },
    { name: 'LED Bulb 12W', category: 'Electrical', brand: 'Local', baseUnit: 'piece', retailPrice: 280, wholesalePrice: 240, costPrice: 170, reorderLevel: 30, barcode: '8900010' },
    { name: 'Electrical Wire 7/29 (100m)', category: 'Electrical', brand: 'Local', baseUnit: 'roll', retailPrice: 4200, wholesalePrice: 3800, costPrice: 3100, reorderLevel: 5, barcode: '8900011' },
    { name: 'Measuring Tape 5m', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 380, wholesalePrice: 320, costPrice: 240, reorderLevel: 15, barcode: '8900012' },
  ];

  const products = productDefs.map((p) => {
    const category = categories.find((c) => c.name === p.category)!;
    const brand = brands.find((b) => b.name === p.brand)!;
    return unwrap(
      productsHandler.create(db, {
        name: p.name,
        categoryId: category.id,
        brandId: brand.id,
        baseUnit: p.baseUnit,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        costPrice: p.costPrice,
        reorderLevel: p.reorderLevel,
        barcode: p.barcode,
      }),
      `product ${p.name}`
    );
  });
  const byName = (name: string) => products.find((p) => p.name === name)!;

  // --- Customers ---
  const customerDefs = [
    { name: 'Ahmed Furniture House', phone: '0300-1234567', type: 'wholesale' as const, address: 'Main Market, Lahore' },
    { name: 'Bilal Construction', phone: '0321-9876543', type: 'contractor' as const, address: 'DHA Phase 5, Lahore' },
    { name: 'Walk-in Customer', phone: null, type: 'retail' as const, address: null },
    { name: 'Noor Electric Works', phone: '0333-4455667', type: 'retail' as const, address: 'Ichhra, Lahore' },
  ];
  const customers = customerDefs.map((c) => unwrap(customersHandler.create(db, c), `customer ${c.name}`));

  // --- Suppliers ---
  const supplierDefs = [
    { name: 'Al-Haaj Hardware Traders', phone: '042-1112233', address: 'Shahalam Market, Lahore' },
    { name: 'Bosch Authorized Distributor', phone: '021-5566778', address: 'Karachi' },
    { name: 'Asian Paints Depot', phone: '042-3344556', address: 'Multan Road, Lahore' },
  ];
  const suppliers = supplierDefs.map((s) => unwrap(suppliersHandler.create(db, s), `supplier ${s.name}`));

  // --- Purchases (stock in) ---
  function purchaseLine(name: string, qty: number) {
    const p = byName(name);
    const unitPrice = p.costPrice ?? 0;
    return { productId: p.id, productName: p.name, quantity: qty, unit: p.baseUnit, unitPrice, lineTotal: qty * unitPrice };
  }

  const po1Items = [purchaseLine('Claw Hammer 16oz', 40), purchaseLine('Adjustable Wrench 10"', 30), purchaseLine('Measuring Tape 5m', 25)];
  const po1Subtotal = po1Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[0].id,
      supplierName: suppliers[0].name,
      items: po1Items,
      subtotal: po1Subtotal,
      freightAmount: 500,
      total: po1Subtotal + 500,
      paidAmount: po1Subtotal + 500,
      paymentMode: 'cash',
    }),
    'PO1'
  );

  const po2Items = [purchaseLine('Cordless Drill 18V', 8), purchaseLine('Angle Grinder 4"', 10)];
  const po2Subtotal = po2Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[1].id,
      supplierName: suppliers[1].name,
      items: po2Items,
      subtotal: po2Subtotal,
      freightAmount: 1200,
      total: po2Subtotal + 1200,
      paidAmount: 30000,
      paymentMode: 'partial',
    }),
    'PO2'
  ); // leaves a payable balance on Bosch Distributor

  const po3Items = [purchaseLine('Weather Shield Paint 4L', 20)];
  const po3Subtotal = po3Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[2].id,
      supplierName: suppliers[2].name,
      items: po3Items,
      subtotal: po3Subtotal,
      freightAmount: 0,
      total: po3Subtotal,
      paidAmount: 0,
      paymentMode: 'credit',
    }),
    'PO3'
  ); // fully on credit

  const po4Items = [
    purchaseLine('Wood Screws 1" (box)', 60),
    purchaseLine('Hex Bolts M8x50 (box)', 50),
    purchaseLine('PVC Pipe 1" (20ft)', 40),
    purchaseLine('Elbow Joint 1"', 150),
    purchaseLine('LED Bulb 12W', 100),
    purchaseLine('Electrical Wire 7/29 (100m)', 15),
  ];
  const po4Subtotal = po4Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[0].id,
      supplierName: suppliers[0].name,
      items: po4Items,
      subtotal: po4Subtotal,
      freightAmount: 800,
      total: po4Subtotal + 800,
      paidAmount: po4Subtotal + 800,
      paymentMode: 'cash',
    }),
    'PO4'
  );

  // --- Sales (stock out, mix of cash/credit/partial, retail + wholesale) ---
  function saleLine(name: string, qty: number, priceTier: 'retail' | 'wholesale' = 'retail', discountPercent = 0) {
    const p = byName(name);
    const unitPrice = priceTier === 'wholesale' ? p.wholesalePrice ?? 0 : p.retailPrice ?? 0;
    const gross = qty * unitPrice;
    const lineTotal = gross * (1 - discountPercent / 100);
    return { productId: p.id, productName: p.name, quantity: qty, unit: p.baseUnit, unitPrice, discountPercent, lineTotal };
  }

  const s1Items = [saleLine('LED Bulb 12W', 10), saleLine('Elbow Joint 1"', 20)];
  const s1Subtotal = s1Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale1 = unwrap(
    salesHandler.create(db, {
      customerId: customers[2].id, // Walk-in
      customerName: customers[2].name,
      items: s1Items,
      subtotal: s1Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s1Subtotal,
      paidAmount: s1Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale1'
  );

  const s2Items = [
    saleLine('Claw Hammer 16oz', 15, 'wholesale'),
    saleLine('Adjustable Wrench 10"', 10, 'wholesale'),
    saleLine('Measuring Tape 5m', 10, 'wholesale'),
  ];
  const s2Subtotal = s2Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    salesHandler.create(db, {
      customerId: customers[0].id, // Ahmed Furniture House
      customerName: customers[0].name,
      items: s2Items,
      subtotal: s2Subtotal,
      discountAmount: 0,
      freightAmount: 300,
      total: s2Subtotal + 300,
      paidAmount: 0,
      paymentMode: 'credit',
      priceTier: 'wholesale',
    }),
    'Sale2'
  ); // full receivable on Ahmed Furniture House

  const s3Items = [saleLine('Cordless Drill 18V', 2), saleLine('Angle Grinder 4"', 1)];
  const s3Subtotal = s3Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    salesHandler.create(db, {
      customerId: customers[1].id, // Bilal Construction
      customerName: customers[1].name,
      items: s3Items,
      subtotal: s3Subtotal,
      discountAmount: 500,
      freightAmount: 0,
      total: s3Subtotal - 500,
      paidAmount: 15000,
      paymentMode: 'partial',
      priceTier: 'retail',
    }),
    'Sale3'
  ); // partial receivable on Bilal Construction

  const s4Items = [saleLine('Electrical Wire 7/29 (100m)', 3), saleLine('LED Bulb 12W', 25)];
  const s4Subtotal = s4Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    salesHandler.create(db, {
      customerId: customers[3].id, // Noor Electric Works
      customerName: customers[3].name,
      items: s4Items,
      subtotal: s4Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s4Subtotal,
      paidAmount: s4Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale4'
  );

  // A return against Sale1, to exercise returns + the stock/credit reversal path.
  unwrap(
    salesHandler.returnSale(db, sale1.id, [{ productId: byName('LED Bulb 12W').id, quantity: 2 }], 'Customer returned 2 unused bulbs'),
    'Return on Sale1'
  );

  // --- Payments (partial settlement against the Sale3 receivable) ---
  unwrap(
    paymentsHandler.create(db, {
      partyType: 'customer',
      partyId: customers[1].id,
      partyName: customers[1].name,
      amount: 5000,
      direction: 'received',
      mode: 'cash',
      notes: 'Partial settlement on account',
    }),
    'Payment from Bilal Construction'
  );

  // Payment out against the PO2 payable (Bosch Distributor).
  unwrap(
    paymentsHandler.create(db, {
      partyType: 'supplier',
      partyId: suppliers[1].id,
      partyName: suppliers[1].name,
      amount: 10000,
      direction: 'paid',
      mode: 'bank_transfer',
      notes: 'Partial settlement on account',
    }),
    'Payment to Bosch Distributor'
  );

  // --- Quotations (one pending, not converted — for the Quotations list) ---
  const qItems = [saleLine('Cordless Drill 18V', 1), saleLine('Angle Grinder 4"', 2)];
  const qSubtotal = qItems.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    quotationsHandler.create(db, {
      customerId: customers[1].id,
      customerName: customers[1].name,
      customerPhone: '0321-9876543',
      items: qItems,
      subtotal: qSubtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: qSubtotal,
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      notes: 'Pending customer approval for site tools',
    }),
    'Quotation1'
  );

  // --- Expenses ---
  const today = new Date().toISOString().slice(0, 10);
  const expenseDefs = [
    { date: today, expenseHead: 'Rent', description: 'Shop rent — this month', amount: 45000, paymentMode: 'bank_transfer' as const },
    { date: today, expenseHead: 'Utilities', description: 'Electricity bill', amount: 8200, paymentMode: 'cash' as const },
    { date: today, expenseHead: 'Salaries', description: 'Staff salary — helper', amount: 25000, paymentMode: 'cash' as const },
    { date: today, expenseHead: 'Transport', description: 'Delivery van fuel', amount: 3500, paymentMode: 'cash' as const },
  ];
  expenseDefs.forEach((e) => unwrap(expensesHandler.create(db, e), `expense ${e.expenseHead}`));

  console.log('Seed complete.');
  console.log(`  Categories: ${categories.length}, Brands: ${brands.length}, Products: ${products.length}`);
  console.log(`  Customers: ${customers.length}, Suppliers: ${suppliers.length}`);
  console.log('  Purchases: 4, Sales: 4 (+1 return), Payments: 2, Quotations: 1, Expenses: 4');
  console.log(`\nDB file: ${dbPath}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
