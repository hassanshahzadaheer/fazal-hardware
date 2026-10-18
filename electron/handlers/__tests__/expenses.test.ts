import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create, update, remove } from '../expenses';

describe('expenses handler (Task 8.1)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_expenses.db');

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

  it('starts empty', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([]);
  });

  it('creates an expense defaulting payment_mode to cash', () => {
    const result = create(testDb, { date: '2026-10-18', expenseHead: 'Rent', amount: 15000 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.paymentMode).toBe('cash');
      expect(result.data.amount).toBe(15000);
    }
  });

  it('rejects a zero or negative amount', () => {
    const result = create(testDb, { date: '2026-10-18', expenseHead: 'Rent', amount: 0 });
    expect(result.ok).toBe(false);
  });

  it('rejects a missing expense head', () => {
    const result = create(testDb, { date: '2026-10-18', expenseHead: '', amount: 100 });
    expect(result.ok).toBe(false);
  });

  it('updates an expense', () => {
    const created = create(testDb, { date: '2026-10-18', expenseHead: 'Electricity', amount: 5000 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = update(testDb, created.data.id, { amount: 5500 });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.data.amount).toBe(5500);
  });

  it('returns NOT_FOUND when updating a non-existent expense', () => {
    const result = update(testDb, 999999, { amount: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('deletes an expense', () => {
    const created = create(testDb, { date: '2026-10-18', expenseHead: 'Maintenance', amount: 2000 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) expect(after.data.find((e) => e.id === created.data.id)).toBeUndefined();
  });

  it('returns NOT_FOUND when deleting a non-existent expense', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('list() returns all expenses ordered by date descending', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThan(0);
  });
});
