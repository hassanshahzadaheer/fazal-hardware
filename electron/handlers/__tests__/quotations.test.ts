import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, get, create } from '../quotations';
import { create as createSale } from '../sales';
import { create as createProduct } from '../products';
import { create as createCustomer } from '../customers';

describe('quotations handler (Task 7.1) + conversion fix (Task 7.4)', () => {
  let testDb: Database.Database;
  let productId: number;
  let customerId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_quotations.db');

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

    const product = createProduct(testDb, { name: 'Plywood 18mm', baseUnit: 'sheet', retailPrice: 2500 });
    if (!product.ok) throw new Error('setup failed');
    productId = product.data.id;
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

  function quotationPayload(overrides: Record<string, unknown> = {}) {
    return {
      customerId,
      customerName: 'Ali Traders',
      items: [
        { productId, productName: 'Plywood 18mm', quantity: 2, unit: 'sheet', unitPrice: 2500, lineTotal: 5000 },
      ],
      subtotal: 5000,
      total: 5000,
      ...overrides,
    };
  }

  it('starts empty', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('creates a quotation with status draft and a QT-XXXXXX number', () => {
    const result = create(testDb, quotationPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('draft');
      expect(result.data.quotationNumber).toMatch(/^QT-\d{6}$/);
      expect(result.data.convertedToInvoiceId).toBeNull();
    }
  });

  it('rejects a quotation with no line items', () => {
    const result = create(testDb, quotationPayload({ items: [] }));
    expect(result.ok).toBe(false);
  });

  it('get() returns NOT_FOUND for a missing quotation', () => {
    const result = get(testDb, 999999);
    expect(result.ok).toBe(false);
  });

  describe('convert-to-invoice regression (the exact bug the legacy app had)', () => {
    it('converting creates an invoice AND links quotation_id AND flips status to converted — all three, atomically', () => {
      const quotation = create(testDb, quotationPayload());
      expect(quotation.ok).toBe(true);
      if (!quotation.ok) return;

      const invoice = createSale(testDb, {
        customerId,
        customerName: 'Ali Traders',
        items: quotation.data.items,
        subtotal: quotation.data.subtotal,
        total: quotation.data.total,
        paymentMode: 'cash',
        quotationId: quotation.data.id,
      });
      expect(invoice.ok).toBe(true);
      if (!invoice.ok) return;

      // 1. invoice references the quotation
      expect(invoice.data.quotationId).toBe(quotation.data.id);

      // 2. quotation flipped to converted
      const reread = get(testDb, quotation.data.id);
      expect(reread.ok).toBe(true);
      if (reread.ok) {
        expect(reread.data.status).toBe('converted');
        // 3. quotation points back at the invoice
        expect(reread.data.convertedToInvoiceId).toBe(invoice.data.id);
      }
    });

    it('rejects converting an already-converted quotation', () => {
      const quotation = create(testDb, quotationPayload());
      expect(quotation.ok).toBe(true);
      if (!quotation.ok) return;

      const first = createSale(testDb, {
        items: quotation.data.items,
        subtotal: quotation.data.subtotal,
        total: quotation.data.total,
        paymentMode: 'cash',
        quotationId: quotation.data.id,
      });
      expect(first.ok).toBe(true);

      const second = createSale(testDb, {
        items: quotation.data.items,
        subtotal: quotation.data.subtotal,
        total: quotation.data.total,
        paymentMode: 'cash',
        quotationId: quotation.data.id,
      });
      expect(second.ok).toBe(false);
    });
  });
});
