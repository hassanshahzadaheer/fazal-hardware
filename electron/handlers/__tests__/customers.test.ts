import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create, update, remove } from '../customers';

describe('customers handler (Task 2.3)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_customers.db');

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

  it('creates a customer with balance starting at 0', () => {
    const result = create(testDb, { name: 'Ali Traders', type: 'wholesale', phone: '0300-1234567' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.balance).toBe(0);
      expect(result.data.type).toBe('wholesale');
    }
  });

  it('rejects an empty name', () => {
    const result = create(testDb, { name: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid type', () => {
    const result = create(testDb, { name: 'Bad Type Co', type: 'vip' });
    expect(result.ok).toBe(false);
  });

  it('updates fields but silently ignores a caller-supplied balance (only payments change it)', () => {
    const created = create(testDb, { name: 'Contractor Co', type: 'contractor' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = update(testDb, created.data.id, { name: 'Contractor Co.', balance: 5000 } as any);
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.data.name).toBe('Contractor Co.');
      expect(updated.data.balance).toBe(0); // balance is not an editable field via update()
    }
  });

  it('returns NOT_FOUND when updating a non-existent customer', () => {
    const result = update(testDb, 999999, { name: 'Ghost' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('deletes a customer', () => {
    const created = create(testDb, { name: 'Temporary Customer' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) {
      expect(after.data.find((c) => c.id === created.data.id)).toBeUndefined();
    }
  });

  it('returns NOT_FOUND when deleting a non-existent customer', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
