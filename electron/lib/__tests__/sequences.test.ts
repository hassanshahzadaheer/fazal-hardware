import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { nextSequence, generateInvoiceNumber, generatePONumber, generateQuotationNumber } from '../sequences';

describe('sequences (Task 4.1)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_sequences.db');

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

  it('increments sequentially starting at 1', () => {
    expect(nextSequence(testDb, 'sale_invoice')).toBe(1);
    expect(nextSequence(testDb, 'sale_invoice')).toBe(2);
    expect(nextSequence(testDb, 'sale_invoice')).toBe(3);
  });

  it('keeps separate counters per doc_type', () => {
    const invoiceSeq = nextSequence(testDb, 'sale_invoice');
    const poSeq = nextSequence(testDb, 'purchase_order');
    expect(poSeq).toBe(1); // independent of sale_invoice's counter
    expect(invoiceSeq).toBeGreaterThan(poSeq - 1);
  });

  it('throws on an unknown doc_type rather than silently returning garbage', () => {
    expect(() => nextSequence(testDb, 'not_a_real_type')).toThrow();
  });

  it('generates unique sequential invoice numbers with the INV-YYYYMMDD-XXXX format', () => {
    const a = generateInvoiceNumber(testDb);
    const b = generateInvoiceNumber(testDb);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^INV-\d{8}-\d{4}$/);
  });

  it('generates PO numbers with the PO-YYYYMMDD-XXXX format', () => {
    expect(generatePONumber(testDb)).toMatch(/^PO-\d{8}-\d{4}$/);
  });

  it('generates quotation numbers with the QT-XXXXXX format', () => {
    expect(generateQuotationNumber(testDb)).toMatch(/^QT-\d{6}$/);
  });

  it('100 concurrent-style calls produce 100 unique invoice numbers', () => {
    const numbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      numbers.add(generateInvoiceNumber(testDb));
    }
    expect(numbers.size).toBe(100);
  });
});
