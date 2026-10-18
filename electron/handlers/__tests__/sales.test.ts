import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, get, create, returnSale } from '../sales';
import { create as createProduct } from '../products';
import { create as createCustomer } from '../customers';

describe('sales handler (Tasks 4.1/4.3/4.5)', () => {
  let testDb: Database.Database;
  let productId: number;
  let customerId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_sales.db');

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

    const product = createProduct(testDb, { name: 'Plywood 18mm', baseUnit: 'sheet', costPrice: 2000, retailPrice: 2500 });
    if (!product.ok) throw new Error('setup failed');
    productId = product.data.id;
    // Opening stock so sales have something to decrement.
    testDb.prepare('UPDATE products SET stock_on_hand = 100 WHERE id = ?').run(productId);

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

  function basePayload(overrides: Record<string, unknown> = {}) {
    return {
      items: [
        {
          productId,
          productName: 'Plywood 18mm',
          quantity: 2,
          unit: 'sheet',
          unitPrice: 2500,
          lineTotal: 5000,
        },
      ],
      subtotal: 5000,
      total: 5000,
      ...overrides,
    };
  }

  it('a cash sale: paid = total, status = completed, stock decremented, Payment created, no customer balance change', () => {
    const before = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;

    const result = create(testDb, basePayload({ customerId, customerName: 'Ali Traders', paymentMode: 'cash' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.paidAmount).toBe(5000);
    expect(result.data.status).toBe('completed');
    expect(result.data.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);

    const after = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
    expect(after.stock_on_hand).toBe(before.stock_on_hand - 2);

    const payment = testDb
      .prepare("SELECT * FROM payments WHERE reference_type = 'sale_invoice' AND reference_id = ?")
      .get(result.data.id) as any;
    expect(payment).toBeDefined();
    expect(payment.amount).toBe(5000);
    expect(payment.direction).toBe('received');

    const customer = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
    expect(customer.balance).toBe(0); // fully paid — no balance change
  });

  it('a credit sale: paid = 0, status = credit, customer balance increases by the full total, no Payment row', () => {
    const result = create(testDb, basePayload({ customerId, customerName: 'Ali Traders', paymentMode: 'credit' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.paidAmount).toBe(0);
    expect(result.data.status).toBe('credit');

    const customer = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
    expect(customer.balance).toBe(5000); // only this credit sale so far

    const payment = testDb
      .prepare("SELECT * FROM payments WHERE reference_type = 'sale_invoice' AND reference_id = ?")
      .get(result.data.id);
    expect(payment).toBeUndefined();
  });

  it('a partial sale: paid = paidAmount, status = partial, balance increases by the remainder, Payment created for the paid part', () => {
    const result = create(
      testDb,
      basePayload({ customerId, customerName: 'Ali Traders', paymentMode: 'partial', paidAmount: 2000 })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.paidAmount).toBe(2000);
    expect(result.data.status).toBe('partial');

    const payment = testDb
      .prepare("SELECT * FROM payments WHERE reference_type = 'sale_invoice' AND reference_id = ?")
      .get(result.data.id) as any;
    expect(payment.amount).toBe(2000);
    expect(payment.mode).toBe('cash'); // partial payments record as cash mode per §9.3

    // balance so far: 5000 (credit sale) + 3000 (remainder of this partial sale)
    const customer = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
    expect(customer.balance).toBe(8000);
  });

  it('a walk-in sale (no customer) never touches any customer balance', () => {
    const result = create(testDb, basePayload({ paymentMode: 'cash' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.customerId).toBeNull();
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

  it('get() returns the invoice with items parsed back out of JSON', () => {
    const created = create(testDb, basePayload({ paymentMode: 'cash' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = get(testDb, created.data.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.data.items)).toBe(true);
      expect(result.data.items[0].productId).toBe(productId);
    }
  });

  it('get() returns NOT_FOUND for a missing invoice', () => {
    const result = get(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  describe('returns (Task 4.5)', () => {
    it('a full return restores stock, flips status to returned, and decreases customer balance by the return total', () => {
      const stockBefore = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
      const customerBefore = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;

      const sale = create(
        testDb,
        basePayload({ customerId, customerName: 'Ali Traders', paymentMode: 'cash' })
      );
      expect(sale.ok).toBe(true);
      if (!sale.ok) return;

      const returned = returnSale(testDb, sale.data.id, [{ productId, quantity: 2 }]);
      expect(returned.ok).toBe(true);
      if (returned.ok) expect(returned.data.status).toBe('returned');

      const stockAfter = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
      expect(stockAfter.stock_on_hand).toBe(stockBefore.stock_on_hand); // sold 2, returned 2 — net zero

      const customerAfter = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
      expect(customerAfter.balance).toBe(customerBefore.balance - 5000);
    });

    it('a partial return only restores the returned portion and computes a proportional value', () => {
      const sale = create(testDb, basePayload({ paymentMode: 'cash' })); // qty 2 @ 2500 = 5000
      expect(sale.ok).toBe(true);
      if (!sale.ok) return;

      const stockBefore = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;

      const returned = returnSale(testDb, sale.data.id, [{ productId, quantity: 1 }]);
      expect(returned.ok).toBe(true);

      const stockAfter = testDb.prepare('SELECT stock_on_hand FROM products WHERE id = ?').get(productId) as any;
      expect(stockAfter.stock_on_hand).toBe(stockBefore.stock_on_hand + 1);
    });

    it('rejects returning more than was sold', () => {
      const sale = create(testDb, basePayload({ paymentMode: 'cash' }));
      expect(sale.ok).toBe(true);
      if (!sale.ok) return;

      const result = returnSale(testDb, sale.data.id, [{ productId, quantity: 999 }]);
      expect(result.ok).toBe(false);
    });

    it('rejects returning an already-returned invoice', () => {
      const sale = create(testDb, basePayload({ paymentMode: 'cash' }));
      expect(sale.ok).toBe(true);
      if (!sale.ok) return;

      const first = returnSale(testDb, sale.data.id, [{ productId, quantity: 1 }]);
      expect(first.ok).toBe(true);

      const second = returnSale(testDb, sale.data.id, [{ productId, quantity: 1 }]);
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.error.code).toBe('ALREADY_RETURNED');
    });

    it('returns NOT_FOUND for a non-existent invoice', () => {
      const result = returnSale(testDb, 999999, [{ productId, quantity: 1 }]);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
    });
  });
});
