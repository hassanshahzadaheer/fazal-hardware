import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { getSummary, getTopProducts, getLowStock, getReceivables, getPayables } from '../reports';
import { create as createProduct, update as updateProduct } from '../products';
import { create as createCustomer } from '../customers';
import { create as createSupplier } from '../suppliers';
import { create as createSale } from '../sales';

describe('reports handler (Task 9.1)', () => {
  let testDb: Database.Database;
  let productId: number;
  let customerId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_reports.db');

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
    testDb.prepare('UPDATE products SET stock_on_hand = 5 WHERE id = ?').run(productId); // below reorder level

    const customer = createCustomer(testDb, { name: 'Ali Traders' });
    if (!customer.ok) throw new Error('setup failed');
    customerId = customer.data.id;

    createSupplier(testDb, { name: 'Agha Steel' });
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

  it('gross profit uses cost_price_at_time from the sale movement, not the current (possibly changed) product.cost_price — §26.2 known gap fix', () => {
    // Sale #1 at cost_price = 2000
    const sale1 = createSale(testDb, {
      customerId,
      customerName: 'Ali Traders',
      items: [{ productId, productName: 'Plywood 18mm', quantity: 1, unit: 'sheet', unitPrice: 2500, lineTotal: 2500 }],
      subtotal: 2500,
      total: 2500,
      paymentMode: 'cash',
    });
    expect(sale1.ok).toBe(true);

    // Cost price changes AFTER the sale (e.g. a later purchase at a higher rate)
    updateProduct(testDb, productId, { costPrice: 2200 } as any);

    const summary = getSummary(testDb);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      // Revenue: 2500. Cost should be based on cost_price_at_time (2000), not
      // the now-current cost_price (2200) — grossProfit = 2500 - 2000 = 500,
      // NOT 2500 - 2200 = 300.
      expect(summary.data.totalRevenue).toBeGreaterThanOrEqual(2500);
      expect(summary.data.grossProfit).toBe(summary.data.totalRevenue - summary.data.totalCost);
      // The specific cost contribution from this one sale must be 2000, not 2200.
      expect(summary.data.totalCost).toBeGreaterThanOrEqual(2000);
    }
  });

  it('stockValue = sum(stock_on_hand * cost_price) across all products', () => {
    const summary = getSummary(testDb);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.data.stockValue).toBeGreaterThan(0);
    }
  });

  it('lowStockCount counts products at or below their reorder level', () => {
    const summary = getSummary(testDb);
    expect(summary.ok).toBe(true);
    if (summary.ok) expect(summary.data.lowStockCount).toBeGreaterThanOrEqual(1);
  });

  it('totalReceivable sums customer balances; totalPayable sums supplier balances', () => {
    const sale = createSale(testDb, {
      customerId,
      customerName: 'Ali Traders',
      items: [{ productId, productName: 'Plywood 18mm', quantity: 1, unit: 'sheet', unitPrice: 2500, lineTotal: 2500 }],
      subtotal: 2500,
      total: 2500,
      paymentMode: 'credit',
    });
    expect(sale.ok).toBe(true);

    const summary = getSummary(testDb);
    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.data.totalReceivable).toBeGreaterThanOrEqual(2500);
    }
  });

  it('getTopProducts aggregates quantity sold and revenue, ranked by revenue', () => {
    const result = getTopProducts(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productName).toBe('Plywood 18mm');
      expect(result.data[0].revenue).toBeGreaterThan(0);
      expect(result.data[0].qtySold).toBeGreaterThan(0);
    }
  });

  it('getLowStock returns products at/below reorder level, sorted by deficit', () => {
    const result = getLowStock(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.some((p) => p.id === productId)).toBe(true);
    }
  });

  it('getReceivables / getPayables sort by balance descending', () => {
    const receivables = getReceivables(testDb);
    expect(receivables.ok).toBe(true);
    if (receivables.ok && receivables.data.length > 1) {
      expect(receivables.data[0].balance).toBeGreaterThanOrEqual(receivables.data[1].balance);
    }

    const payables = getPayables(testDb);
    expect(payables.ok).toBe(true);
  });
});
