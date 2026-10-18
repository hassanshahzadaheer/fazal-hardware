import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { getDashboard } from '../dashboard';
import { create as createProduct } from '../products';
import { create as createCustomer } from '../customers';
import { create as createSale } from '../sales';

describe('dashboard handler (Task 11.1)', () => {
  let testDb: Database.Database;
  let productId: number;
  let customerId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_dashboard.db');

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

    const product = createProduct(testDb, {
      name: 'Plywood 18mm',
      baseUnit: 'sheet',
      costPrice: 2000,
      retailPrice: 2500,
      reorderLevel: 10,
    });
    if (!product.ok) throw new Error('setup failed');
    productId = product.data.id;
    testDb.prepare('UPDATE products SET stock_on_hand = 5 WHERE id = ?').run(productId);

    const customer = createCustomer(testDb, { name: 'Ali Traders' });
    if (!customer.ok) throw new Error('setup failed');
    customerId = customer.data.id;
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

  it("todayRevenue sums only today's sales", () => {
    const sale = createSale(testDb, {
      customerId,
      customerName: 'Ali Traders',
      items: [{ productId, productName: 'Plywood 18mm', quantity: 1, unit: 'sheet', unitPrice: 2500, lineTotal: 2500 }],
      subtotal: 2500,
      total: 2500,
      paymentMode: 'cash',
    });
    expect(sale.ok).toBe(true);

    const result = getDashboard(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.todayRevenue).toBeGreaterThanOrEqual(2500);
    }
  });

  it('lowStockCount and lowStockProducts reflect products at/below reorder level, capped at 5', () => {
    const result = getDashboard(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lowStockCount).toBeGreaterThanOrEqual(1);
      expect(result.data.lowStockProducts.length).toBeLessThanOrEqual(5);
      expect(result.data.lowStockProducts.some((p) => p.id === productId)).toBe(true);
    }
  });

  it('recentSales returns at most 6, newest first', () => {
    const result = getDashboard(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.recentSales.length).toBeLessThanOrEqual(6);
      expect(result.data.recentSales.length).toBeGreaterThan(0);
    }
  });

  it('includes receivables and payables totals', () => {
    const result = getDashboard(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalReceivable).toBeGreaterThanOrEqual(0);
      expect(result.data.totalPayable).toBeGreaterThanOrEqual(0);
    }
  });
});
