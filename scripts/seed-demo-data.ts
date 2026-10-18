// Seeds the dev database with realistic demo data so the app can be clicked
// through end-to-end. Run with: npx tsx scripts/seed-demo-data.ts
// Uses the real handler functions (not raw SQL) so every insert goes through
// the same validation/business logic as the running app (stock movements,
// sequence numbers, balance updates, etc.)
import * as path from 'path';
import { initDb } from '../electron/db';
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

// Every handler stamps created_date as `datetime('now')` — fine for real use,
// but it means a one-shot seed script would otherwise dump everything onto a
// single day, making the Dashboard's "last 7 days" sales chart and Reports
// trends look empty/flat. This backdates a row's created_date (and
// updated_date, so nothing looks edited after the fact) directly, purely for
// demo presentability — the real app never does this.
function backdate(db: ReturnType<typeof initDb>, table: string, id: number, daysAgo: number, hour = 14): void {
  db.prepare(
    `UPDATE ${table} SET created_date = datetime('now', '-${daysAgo} days', 'start of day', '+${hour} hours'), updated_date = datetime('now', '-${daysAgo} days', 'start of day', '+${hour} hours') WHERE id = ?`
  ).run(id);
}

async function main() {
  const db = initDb(dbPath);

  console.log(`Seeding ${dbPath} ...`);

  // --- Categories & Brands ---
  const categoryNames = ['Hand Tools', 'Power Tools', 'Fasteners', 'Paint & Chemicals', 'Pipes & Fittings', 'Electrical', 'Safety & Workwear', 'Adhesives & Sealants'];
  const categories = categoryNames.map((name) => unwrap(categoriesHandler.create(db, { name }), `category ${name}`));

  const brandNames = ['Bosch', 'Stanley', 'Dewalt', 'Asian Paints', 'Makita', 'Local'];
  const brands = brandNames.map((name) => unwrap(brandsHandler.create(db, { name }), `brand ${name}`));

  // --- Products ---
  const productDefs = [
    { name: 'Claw Hammer 16oz', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 850, wholesalePrice: 750, costPrice: 600, reorderLevel: 10, barcode: '8900001' },
    { name: 'Adjustable Wrench 10"', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 650, wholesalePrice: 550, costPrice: 420, reorderLevel: 8, barcode: '8900002' },
    { name: 'Measuring Tape 5m', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 380, wholesalePrice: 320, costPrice: 240, reorderLevel: 15, barcode: '8900012' },
    { name: 'Screwdriver Set (6pc)', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'set', retailPrice: 1200, wholesalePrice: 1050, costPrice: 820, reorderLevel: 10, barcode: '8900013' },
    { name: 'Pliers 8" Combination', category: 'Hand Tools', brand: 'Stanley', baseUnit: 'piece', retailPrice: 540, wholesalePrice: 460, costPrice: 350, reorderLevel: 12, barcode: '8900014' },
    { name: 'Spirit Level 24"', category: 'Hand Tools', brand: 'Local', baseUnit: 'piece', retailPrice: 780, wholesalePrice: 680, costPrice: 520, reorderLevel: 6, barcode: '8900015' },
    { name: 'Hand Saw 20"', category: 'Hand Tools', brand: 'Local', baseUnit: 'piece', retailPrice: 420, wholesalePrice: 360, costPrice: 270, reorderLevel: 10, barcode: '8900016' },

    { name: 'Cordless Drill 18V', category: 'Power Tools', brand: 'Bosch', baseUnit: 'piece', retailPrice: 12500, wholesalePrice: 11200, costPrice: 9000, reorderLevel: 3, barcode: '8900003' },
    { name: 'Angle Grinder 4"', category: 'Power Tools', brand: 'Dewalt', baseUnit: 'piece', retailPrice: 8900, wholesalePrice: 7900, costPrice: 6500, reorderLevel: 4, barcode: '8900004' },
    { name: 'Circular Saw 7"', category: 'Power Tools', brand: 'Makita', baseUnit: 'piece', retailPrice: 15800, wholesalePrice: 14200, costPrice: 11500, reorderLevel: 2, barcode: '8900017' },
    { name: 'Heat Gun 2000W', category: 'Power Tools', brand: 'Bosch', baseUnit: 'piece', retailPrice: 6200, wholesalePrice: 5500, costPrice: 4300, reorderLevel: 3, barcode: '8900018' },
    { name: 'Rotary Hammer Drill SDS', category: 'Power Tools', brand: 'Makita', baseUnit: 'piece', retailPrice: 22500, wholesalePrice: 20500, costPrice: 17000, reorderLevel: 2, barcode: '8900019' },

    { name: 'Wood Screws 1" (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 180, wholesalePrice: 150, costPrice: 110, reorderLevel: 20, barcode: '8900005' },
    { name: 'Hex Bolts M8x50 (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 320, wholesalePrice: 280, costPrice: 220, reorderLevel: 15, barcode: '8900006' },
    { name: 'Washers Assorted (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 150, wholesalePrice: 120, costPrice: 85, reorderLevel: 20, barcode: '8900020' },
    { name: 'Anchor Bolts 10mm (box)', category: 'Fasteners', brand: 'Local', baseUnit: 'box', retailPrice: 420, wholesalePrice: 370, costPrice: 290, reorderLevel: 10, barcode: '8900021' },

    { name: 'Weather Shield Paint 4L', category: 'Paint & Chemicals', brand: 'Asian Paints', baseUnit: 'piece', retailPrice: 3200, wholesalePrice: 2900, costPrice: 2300, reorderLevel: 6, barcode: '8900007' },
    { name: 'Enamel Paint 1L (White)', category: 'Paint & Chemicals', brand: 'Asian Paints', baseUnit: 'piece', retailPrice: 950, wholesalePrice: 830, costPrice: 620, reorderLevel: 10, barcode: '8900022' },
    { name: 'Primer 4L', category: 'Paint & Chemicals', brand: 'Asian Paints', baseUnit: 'piece', retailPrice: 2100, wholesalePrice: 1850, costPrice: 1450, reorderLevel: 8, barcode: '8900023' },
    { name: 'Paint Brush Set (5pc)', category: 'Paint & Chemicals', brand: 'Local', baseUnit: 'set', retailPrice: 420, wholesalePrice: 350, costPrice: 240, reorderLevel: 15, barcode: '8900024' },

    { name: 'PVC Pipe 1" (20ft)', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 950, wholesalePrice: 820, costPrice: 650, reorderLevel: 12, barcode: '8900008' },
    { name: 'Elbow Joint 1"', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 45, wholesalePrice: 35, costPrice: 20, reorderLevel: 50, barcode: '8900009' },
    { name: 'PVC Pipe 2" (20ft)', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 1650, wholesalePrice: 1450, costPrice: 1150, reorderLevel: 8, barcode: '8900025' },
    { name: 'Tee Joint 1"', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 60, wholesalePrice: 48, costPrice: 28, reorderLevel: 40, barcode: '8900026' },
    { name: 'Gate Valve 1"', category: 'Pipes & Fittings', brand: 'Local', baseUnit: 'piece', retailPrice: 680, wholesalePrice: 580, costPrice: 420, reorderLevel: 10, barcode: '8900027' },

    { name: 'LED Bulb 12W', category: 'Electrical', brand: 'Local', baseUnit: 'piece', retailPrice: 280, wholesalePrice: 240, costPrice: 170, reorderLevel: 30, barcode: '8900010' },
    { name: 'Electrical Wire 7/29 (100m)', category: 'Electrical', brand: 'Local', baseUnit: 'roll', retailPrice: 4200, wholesalePrice: 3800, costPrice: 3100, reorderLevel: 5, barcode: '8900011' },
    { name: 'Switch Socket Combo', category: 'Electrical', brand: 'Local', baseUnit: 'piece', retailPrice: 220, wholesalePrice: 185, costPrice: 130, reorderLevel: 25, barcode: '8900028' },
    { name: 'MCB 32A Single Pole', category: 'Electrical', brand: 'Local', baseUnit: 'piece', retailPrice: 650, wholesalePrice: 560, costPrice: 420, reorderLevel: 10, barcode: '8900029' },
    { name: 'Extension Board 4-Socket', category: 'Electrical', brand: 'Local', baseUnit: 'piece', retailPrice: 850, wholesalePrice: 740, costPrice: 560, reorderLevel: 12, barcode: '8900030' },

    { name: 'Safety Helmet', category: 'Safety & Workwear', brand: 'Local', baseUnit: 'piece', retailPrice: 650, wholesalePrice: 550, costPrice: 400, reorderLevel: 15, barcode: '8900031' },
    { name: 'Safety Gloves (pair)', category: 'Safety & Workwear', brand: 'Local', baseUnit: 'pair', retailPrice: 220, wholesalePrice: 180, costPrice: 120, reorderLevel: 20, barcode: '8900032' },
    { name: 'Safety Goggles', category: 'Safety & Workwear', brand: 'Local', baseUnit: 'piece', retailPrice: 350, wholesalePrice: 300, costPrice: 210, reorderLevel: 15, barcode: '8900033' },

    { name: 'Silicone Sealant Tube', category: 'Adhesives & Sealants', brand: 'Local', baseUnit: 'piece', retailPrice: 420, wholesalePrice: 360, costPrice: 260, reorderLevel: 20, barcode: '8900034' },
    { name: 'Epoxy Adhesive 50g', category: 'Adhesives & Sealants', brand: 'Local', baseUnit: 'piece', retailPrice: 280, wholesalePrice: 230, costPrice: 160, reorderLevel: 15, barcode: '8900035' },
    { name: 'Duct Tape Roll', category: 'Adhesives & Sealants', brand: 'Local', baseUnit: 'roll', retailPrice: 180, wholesalePrice: 150, costPrice: 95, reorderLevel: 25, barcode: '8900036' },
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
    { name: 'Zafar Builders & Developers', phone: '0345-2211009', type: 'contractor' as const, address: 'Johar Town, Lahore' },
    { name: 'Al-Madina General Store', phone: '0311-7788990', type: 'wholesale' as const, address: 'Badami Bagh, Lahore' },
  ];
  const customers = customerDefs.map((c) => unwrap(customersHandler.create(db, c), `customer ${c.name}`));

  // --- Suppliers ---
  const supplierDefs = [
    { name: 'Al-Haaj Hardware Traders', phone: '042-1112233', address: 'Shahalam Market, Lahore' },
    { name: 'Bosch Authorized Distributor', phone: '021-5566778', address: 'Karachi' },
    { name: 'Asian Paints Depot', phone: '042-3344556', address: 'Multan Road, Lahore' },
    { name: 'Makita Power Tools Agency', phone: '021-7766554', address: 'Karachi' },
  ];
  const suppliers = supplierDefs.map((s) => unwrap(suppliersHandler.create(db, s), `supplier ${s.name}`));

  // --- Purchases (stock in) ---
  function purchaseLine(name: string, qty: number) {
    const p = byName(name);
    const unitPrice = p.costPrice ?? 0;
    return { productId: p.id, productName: p.name, quantity: qty, unit: p.baseUnit, unitPrice, lineTotal: qty * unitPrice };
  }

  const po1Items = [
    purchaseLine('Claw Hammer 16oz', 40),
    purchaseLine('Adjustable Wrench 10"', 30),
    purchaseLine('Measuring Tape 5m', 25),
    purchaseLine('Screwdriver Set (6pc)', 20),
    purchaseLine('Pliers 8" Combination', 20),
    purchaseLine('Spirit Level 24"', 12),
    purchaseLine('Hand Saw 20"', 15),
  ];
  const po1Subtotal = po1Items.reduce((s, i) => s + i.lineTotal, 0);
  const po1 = unwrap(
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
  backdate(db, 'purchase_orders', po1.id, 9);

  const po2Items = [purchaseLine('Cordless Drill 18V', 8), purchaseLine('Angle Grinder 4"', 10), purchaseLine('Heat Gun 2000W', 6)];
  const po2Subtotal = po2Items.reduce((s, i) => s + i.lineTotal, 0);
  const po2 = unwrap(
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
  backdate(db, 'purchase_orders', po2.id, 8);

  const po3Items = [
    purchaseLine('Weather Shield Paint 4L', 20),
    purchaseLine('Enamel Paint 1L (White)', 30),
    purchaseLine('Primer 4L', 15),
    purchaseLine('Paint Brush Set (5pc)', 25),
  ];
  const po3Subtotal = po3Items.reduce((s, i) => s + i.lineTotal, 0);
  const po3 = unwrap(
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
  backdate(db, 'purchase_orders', po3.id, 6);

  const po4Items = [
    purchaseLine('Wood Screws 1" (box)', 60),
    purchaseLine('Hex Bolts M8x50 (box)', 50),
    purchaseLine('Washers Assorted (box)', 40),
    purchaseLine('Anchor Bolts 10mm (box)', 30),
    purchaseLine('PVC Pipe 1" (20ft)', 40),
    purchaseLine('PVC Pipe 2" (20ft)', 20),
    purchaseLine('Elbow Joint 1"', 150),
    purchaseLine('Tee Joint 1"', 120),
    purchaseLine('Gate Valve 1"', 25),
    purchaseLine('LED Bulb 12W', 100),
    purchaseLine('Electrical Wire 7/29 (100m)', 15),
    purchaseLine('Switch Socket Combo', 60),
    purchaseLine('MCB 32A Single Pole', 30),
    purchaseLine('Extension Board 4-Socket', 20),
  ];
  const po4Subtotal = po4Items.reduce((s, i) => s + i.lineTotal, 0);
  const po4 = unwrap(
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
  backdate(db, 'purchase_orders', po4.id, 5);

  const po5Items = [
    purchaseLine('Circular Saw 7"', 5),
    purchaseLine('Rotary Hammer Drill SDS', 4),
  ];
  const po5Subtotal = po5Items.reduce((s, i) => s + i.lineTotal, 0);
  const po5 = unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[3].id,
      supplierName: suppliers[3].name,
      items: po5Items,
      subtotal: po5Subtotal,
      freightAmount: 1500,
      total: po5Subtotal + 1500,
      paidAmount: po5Subtotal + 1500,
      paymentMode: 'cash',
    }),
    'PO5'
  );
  backdate(db, 'purchase_orders', po5.id, 4);

  const po6Items = [
    purchaseLine('Safety Helmet', 25),
    purchaseLine('Safety Gloves (pair)', 40),
    purchaseLine('Safety Goggles', 25),
    purchaseLine('Silicone Sealant Tube', 35),
    purchaseLine('Epoxy Adhesive 50g', 30),
    purchaseLine('Duct Tape Roll', 50),
  ];
  const po6Subtotal = po6Items.reduce((s, i) => s + i.lineTotal, 0);
  const po6 = unwrap(
    purchasesHandler.create(db, {
      supplierId: suppliers[0].id,
      supplierName: suppliers[0].name,
      items: po6Items,
      subtotal: po6Subtotal,
      freightAmount: 400,
      total: po6Subtotal + 400,
      paidAmount: po6Subtotal + 400,
      paymentMode: 'cash',
    }),
    'PO6'
  );
  backdate(db, 'purchase_orders', po6.id, 3);

  // --- Sales (stock out, mix of cash/credit/partial, retail + wholesale) ---
  function saleLine(name: string, qty: number, priceTier: 'retail' | 'wholesale' = 'retail', discountPercent = 0) {
    const p = byName(name);
    const unitPrice = priceTier === 'wholesale' ? p.wholesalePrice ?? 0 : p.retailPrice ?? 0;
    const gross = qty * unitPrice;
    const lineTotal = gross * (1 - discountPercent / 100);
    return { productId: p.id, productName: p.name, quantity: qty, unit: p.baseUnit, unitPrice, discountPercent, lineTotal };
  }

  const s1Items = [saleLine('LED Bulb 12W', 10), saleLine('Elbow Joint 1"', 20), saleLine('Switch Socket Combo', 6)];
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
  backdate(db, 'sale_invoices', sale1.id, 8);

  const s2Items = [
    saleLine('Claw Hammer 16oz', 15, 'wholesale'),
    saleLine('Adjustable Wrench 10"', 10, 'wholesale'),
    saleLine('Measuring Tape 5m', 10, 'wholesale'),
    saleLine('Screwdriver Set (6pc)', 8, 'wholesale'),
  ];
  const s2Subtotal = s2Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale2 = unwrap(
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
  backdate(db, 'sale_invoices', sale2.id, 7);

  const s3Items = [saleLine('Cordless Drill 18V', 2), saleLine('Angle Grinder 4"', 1), saleLine('Heat Gun 2000W', 1)];
  const s3Subtotal = s3Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale3 = unwrap(
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
  backdate(db, 'sale_invoices', sale3.id, 6);

  const s4Items = [saleLine('Electrical Wire 7/29 (100m)', 3), saleLine('LED Bulb 12W', 25), saleLine('MCB 32A Single Pole', 8)];
  const s4Subtotal = s4Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale4 = unwrap(
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
  backdate(db, 'sale_invoices', sale4.id, 5);

  const s5Items = [
    saleLine('PVC Pipe 1" (20ft)', 20, 'wholesale'),
    saleLine('Elbow Joint 1"', 40, 'wholesale'),
    saleLine('Tee Joint 1"', 30, 'wholesale'),
    saleLine('Gate Valve 1"', 6, 'wholesale'),
  ];
  const s5Subtotal = s5Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale5 = unwrap(
    salesHandler.create(db, {
      customerId: customers[4].id, // Zafar Builders & Developers
      customerName: customers[4].name,
      items: s5Items,
      subtotal: s5Subtotal,
      discountAmount: 0,
      freightAmount: 500,
      total: s5Subtotal + 500,
      paidAmount: 0,
      paymentMode: 'credit',
      priceTier: 'wholesale',
    }),
    'Sale5'
  ); // full receivable on Zafar Builders
  backdate(db, 'sale_invoices', sale5.id, 4);

  const s6Items = [
    saleLine('Weather Shield Paint 4L', 5),
    saleLine('Enamel Paint 1L (White)', 10),
    saleLine('Paint Brush Set (5pc)', 8),
  ];
  const s6Subtotal = s6Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale6 = unwrap(
    salesHandler.create(db, {
      customerId: customers[5].id, // Al-Madina General Store
      customerName: customers[5].name,
      items: s6Items,
      subtotal: s6Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s6Subtotal,
      paidAmount: s6Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale6'
  );
  backdate(db, 'sale_invoices', sale6.id, 3);

  const s7Items = [
    saleLine('Safety Helmet', 10),
    saleLine('Safety Gloves (pair)', 15),
    saleLine('Safety Goggles', 10),
  ];
  const s7Subtotal = s7Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale7 = unwrap(
    salesHandler.create(db, {
      customerId: customers[1].id, // Bilal Construction
      customerName: customers[1].name,
      items: s7Items,
      subtotal: s7Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s7Subtotal,
      paidAmount: s7Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale7'
  );
  backdate(db, 'sale_invoices', sale7.id, 2);

  const s8Items = [saleLine('Circular Saw 7"', 1), saleLine('Silicone Sealant Tube', 6), saleLine('Duct Tape Roll', 10)];
  const s8Subtotal = s8Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale8 = unwrap(
    salesHandler.create(db, {
      customerId: customers[2].id, // Walk-in
      customerName: customers[2].name,
      items: s8Items,
      subtotal: s8Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s8Subtotal,
      paidAmount: s8Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale8'
  );
  backdate(db, 'sale_invoices', sale8.id, 1);

  const s9Items = [saleLine('LED Bulb 12W', 15), saleLine('Extension Board 4-Socket', 4)];
  const s9Subtotal = s9Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale9 = unwrap(
    salesHandler.create(db, {
      customerId: customers[3].id, // Noor Electric Works
      customerName: customers[3].name,
      items: s9Items,
      subtotal: s9Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: s9Subtotal,
      paidAmount: s9Subtotal,
      paymentMode: 'cash',
      priceTier: 'retail',
    }),
    'Sale9'
  );
  backdate(db, 'sale_invoices', sale9.id, 0);

  // A return against Sale1, to exercise returns + the stock/credit reversal path.
  unwrap(
    salesHandler.returnSale(db, sale1.id, [{ productId: byName('LED Bulb 12W').id, quantity: 2 }], 'Customer returned 2 unused bulbs'),
    'Return on Sale1'
  );

  // --- Payments (partial settlement against receivables/payables) ---
  const pay1 = unwrap(
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
  backdate(db, 'payments', pay1.id, 3);

  const pay2 = unwrap(
    paymentsHandler.create(db, {
      partyType: 'customer',
      partyId: customers[0].id,
      partyName: customers[0].name,
      amount: 10000,
      direction: 'received',
      mode: 'bank_transfer',
      notes: 'Partial settlement on account',
    }),
    'Payment from Ahmed Furniture House'
  );
  backdate(db, 'payments', pay2.id, 2);

  // Payment out against the PO2 payable (Bosch Distributor).
  const pay3 = unwrap(
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
  backdate(db, 'payments', pay3.id, 4);

  // --- Quotations (pending, not converted — for the Quotations list) ---
  function dateDaysAgo(daysAgo: number): string {
    return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  }

  const q1Items = [saleLine('Cordless Drill 18V', 1), saleLine('Angle Grinder 4"', 2)];
  const q1Subtotal = q1Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    quotationsHandler.create(db, {
      customerId: customers[1].id,
      customerName: customers[1].name,
      customerPhone: '0321-9876543',
      items: q1Items,
      subtotal: q1Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: q1Subtotal,
      validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      notes: 'Pending customer approval for site tools',
    }),
    'Quotation1'
  );

  const q2Items = [saleLine('PVC Pipe 2" (20ft)', 15, 'wholesale'), saleLine('Gate Valve 1"', 10, 'wholesale')];
  const q2Subtotal = q2Items.reduce((s, i) => s + i.lineTotal, 0);
  unwrap(
    quotationsHandler.create(db, {
      customerId: customers[4].id,
      customerName: customers[4].name,
      customerPhone: '0345-2211009',
      items: q2Items,
      subtotal: q2Subtotal,
      discountAmount: 0,
      freightAmount: 0,
      total: q2Subtotal,
      validUntil: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      notes: 'Plumbing supplies for new site — awaiting go-ahead',
    }),
    'Quotation2'
  );

  // --- Expenses (spread over the last week, for a realistic Expenses list) ---
  const expenseDefs = [
    { date: dateDaysAgo(8), expenseHead: 'Rent', description: 'Shop rent — this month', amount: 45000, paymentMode: 'bank_transfer' as const },
    { date: dateDaysAgo(6), expenseHead: 'Electricity', description: 'Electricity bill', amount: 8200, paymentMode: 'cash' as const },
    { date: dateDaysAgo(5), expenseHead: 'Salary / Wages', description: 'Staff salary — helper', amount: 25000, paymentMode: 'cash' as const },
    { date: dateDaysAgo(4), expenseHead: 'Transport / Freight', description: 'Delivery van fuel', amount: 3500, paymentMode: 'cash' as const },
    { date: dateDaysAgo(3), expenseHead: 'Maintenance', description: 'Shop shelving repair', amount: 6000, paymentMode: 'cash' as const },
    { date: dateDaysAgo(2), expenseHead: 'Miscellaneous', description: 'Packaging materials', amount: 2200, paymentMode: 'cash' as const },
    { date: dateDaysAgo(1), expenseHead: 'Transport / Freight', description: 'Fuel for supplier pickup', amount: 2800, paymentMode: 'cash' as const },
    { date: dateDaysAgo(0), expenseHead: 'Telephone / Internet', description: 'Internet & phone bill', amount: 4500, paymentMode: 'bank_transfer' as const },
  ];
  expenseDefs.forEach((e) => unwrap(expensesHandler.create(db, e), `expense ${e.expenseHead}`));

  console.log('Seed complete.');
  console.log(`  Categories: ${categories.length}, Brands: ${brands.length}, Products: ${products.length}`);
  console.log(`  Customers: ${customers.length}, Suppliers: ${suppliers.length}`);
  console.log('  Purchases: 6, Sales: 9 (+1 return), Payments: 3, Quotations: 2, Expenses: 8');
  console.log(`\nDB file: ${dbPath}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
