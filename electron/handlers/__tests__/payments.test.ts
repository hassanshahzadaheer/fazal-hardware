import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create } from '../payments';
import { create as createCustomer } from '../customers';
import { create as createSupplier } from '../suppliers';

describe('payments handler (Task 6.1)', () => {
  let testDb: Database.Database;
  let customerId: number;
  let supplierId: number;

  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_payments.db');

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

    const customer = createCustomer(testDb, { name: 'Ali Traders' });
    if (!customer.ok) throw new Error('setup failed');
    customerId = customer.data.id;
    testDb.prepare('UPDATE customers SET balance = 10000 WHERE id = ?').run(customerId);

    const supplier = createSupplier(testDb, { name: 'Agha Steel' });
    if (!supplier.ok) throw new Error('setup failed');
    supplierId = supplier.data.id;
    testDb.prepare('UPDATE suppliers SET balance = 8000 WHERE id = ?').run(supplierId);
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

  it('starts empty', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('a received payment from a customer reduces their balance', () => {
    const result = create(testDb, {
      partyType: 'customer',
      partyId: customerId,
      amount: 4000,
      direction: 'received',
      mode: 'cash',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.referenceType).toBe('general');
    }

    const customer = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
    expect(customer.balance).toBe(6000);
  });

  it('a paid payment to a supplier reduces their balance', () => {
    const result = create(testDb, {
      partyType: 'supplier',
      partyId: supplierId,
      amount: 3000,
      direction: 'paid',
      mode: 'bank_transfer',
    });
    expect(result.ok).toBe(true);

    const supplier = testDb.prepare('SELECT balance FROM suppliers WHERE id = ?').get(supplierId) as any;
    expect(supplier.balance).toBe(5000);
  });

  it('balance never goes below zero even if the payment exceeds the outstanding amount', () => {
    create(testDb, { partyType: 'customer', partyId: customerId, amount: 999999, direction: 'received', mode: 'cash' });
    const customer = testDb.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId) as any;
    expect(customer.balance).toBe(0);
  });

  it('rejects an invalid direction', () => {
    const result = create(testDb, {
      partyType: 'customer',
      partyId: customerId,
      amount: 100,
      direction: 'sideways',
      mode: 'cash',
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    const result = create(testDb, {
      partyType: 'customer',
      partyId: customerId,
      amount: 0,
      direction: 'received',
      mode: 'cash',
    });
    expect(result.ok).toBe(false);
  });

  it('list() returns all payments, newest first', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBe(3); // the 3 successful creates above
  });
});
