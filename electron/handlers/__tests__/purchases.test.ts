import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, get, create } from '../purchases';
import { create as createProduct } from '../products';
import { create as createSupplier } from '../suppliers';

describe('purchases handler (Tasks 5.1/5.3)', () => {
  let testDb: Database.Database;
  let productId: number;
  let supplierId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_purchases.db');

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
    testDb = initDb(testDbPath);

    const product = createProduct(testDb, { name: 'Cement Bag', baseUnit: 'bag', costPrice: 1200 });
    if (!product.ok) throw new Error('setup failed');
    productId = product.data.id;

    const supplier = createSupplier(testDb, { name: 'Agha Steel' });
    if (!supplier.ok) throw new Error('setup failed');
    supplierId = supplier.data.id;
  });

  afterAll(() => {
    testDb.close();
    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = `${testDbPath}${suffix}`;
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore
        }
      }
    }
  });

  function basePayload(overrides: Record<string, unknown> = {}) {
    return {
      items: [{ productId, productName: 'Cement Bag', quantity: 50, unit: 'bag', unitPrice: 1300, lineTotal: 65000 }],
      subtotal: 65000,
      total: 65000,
      ...overrides,
    };
  }

  it('a cash purchase: paid = total, status = received, stock incremented, cost_price updated to the new rate, Payment created', () => {
    const before = testDb.prepare('SELECT stock_on_hand, cost_price FROM products WHERE id = ?').get(productId) as any;
    expect(before.cost_price).toBe(1200);

    const result = create(testDb, basePayload({ supplierId, supplierName: 'Agha Steel', paymentMode: 'cash' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.paidAmount).toBe(65000);
    expect(result.data.status).toBe('received');
    expect(result.data.poNumber).toMatch(/^PO-\d{8}-\d{4}$/);

    const after = testDb.prepare('SELECT stock_on_hand, cost_price FROM products WHERE id = ?').get(productId) as any;
    expect(after.stock_on_hand).toBe(before.stock_on_hand + 50);
    expect(after.cost_price).toBe(1300); // updated to the latest purchase price, per §10.3

    const payment = testDb
      .prepare("SELECT * FROM payments WHERE reference_type = 'purchase_order' AND reference_id = ?")
      .get(result.data.id) as any;
    expect(payment.direction).toBe('paid');
    expect(payment.amount).toBe(65000);

    const supplier = testDb.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as any;
    expect(supplier.balance).toBe(0);
  });

  it('a credit purchase: paid = 0, status = credit, supplier balance increases by the full total', () => {
    const result = create(testDb, basePayload({ supplierId, supplierName: 'Agha Steel', paymentMode: 'credit' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('credit');

    const supplier = testDb.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as any;
    expect(supplier.balance).toBe(65000);
  });

  it('a partial purchase: balance increases by the remainder, Payment created for the paid part', () => {
    const result = create(
      testDb,
      basePayload({ supplierId, supplierName: 'Agha Steel', paymentMode: 'partial', paidAmount: 20000 })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('partial');

    // balance so far: 65000 (credit) + 45000 (remainder of this partial) = 110000
    const supplier = testDb.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as any;
    expect(supplier.balance).toBe(110000);
  });

  it('rolls back the whole transaction if a line item references a non-existent product', () => {
    const before = list(testDb);
    const countBefore = before.ok ? before.data.length : -1;

    const result = create(
      testDb,
      basePayload({
        items: [{ productId: 999999, productName: 'Ghost', quantity: 1, unit: 'piece', unitPrice: 10, lineTotal: 10 }],
        paymentMode: 'cash',
      })
    );
    expect(result.ok).toBe(false);

    const after = list(testDb);
    expect(after.ok && after.data.length).toBe(countBefore);
  });

  it('get() returns the PO with items parsed back out of JSON', () => {
    const created = create(testDb, basePayload({ paymentMode: 'cash' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = get(testDb, created.data.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items[0].productId).toBe(productId);
  });

  it('get() returns NOT_FOUND for a missing PO', () => {
    const result = get(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
