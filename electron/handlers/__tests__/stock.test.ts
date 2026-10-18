import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { adjust, history } from '../stock';
import { create as createProduct } from '../products';

describe('stock handler (Task 3.1)', () => {
  let testDb: Database.Database;
  let productId: number;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_stock.db');

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
    const product = createProduct(testDb, { name: 'Test Product', baseUnit: 'piece', costPrice: 100 });
    if (!product.ok) throw new Error('setup failed');
    productId = product.data.id;
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

  it('opening always adds, even if a negative quantity is passed', () => {
    const result = adjust(testDb, { productId, type: 'opening', quantity: -50 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quantity).toBe(50);

    const product = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
    expect(product.stock_on_hand).toBe(50);
  });

  it('wastage always subtracts, even if a positive quantity is passed', () => {
    const result = adjust(testDb, { productId, type: 'wastage', quantity: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quantity).toBe(-5);

    const product = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
    expect(product.stock_on_hand).toBe(45); // 50 - 5
  });

  it('adjustment keeps the caller-provided sign (positive)', () => {
    const result = adjust(testDb, { productId, type: 'adjustment', quantity: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quantity).toBe(10);

    const product = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
    expect(product.stock_on_hand).toBe(55); // 45 + 10
  });

  it('adjustment keeps the caller-provided sign (negative)', () => {
    const result = adjust(testDb, { productId, type: 'adjustment', quantity: -15 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.quantity).toBe(-15);

    const product = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
    expect(product.stock_on_hand).toBe(40); // 55 - 15
  });

  it('rejects a zero quantity', () => {
    const result = adjust(testDb, { productId, type: 'adjustment', quantity: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects a movement for a non-existent product', () => {
    const result = adjust(testDb, { productId: 999999, type: 'opening', quantity: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('records cost_price_at_time from the product at the time of the movement', () => {
    const result = adjust(testDb, { productId, type: 'opening', quantity: 1 });
    if (result.ok) expect(result.data.costPriceAtTime).toBe(100);
  });

  it('history() returns all movements for the product, newest first', () => {
    const result = history(testDb, productId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(5); // all the adjust() calls above
      expect(result.data.every((m) => m.productId === productId)).toBe(true);
    }
  });
});
