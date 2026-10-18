import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create, update, remove } from '../suppliers';

describe('suppliers handler (Task 2.4)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_suppliers.db');

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

  it('creates a supplier with balance starting at 0 (no type field, unlike customers)', () => {
    const result = create(testDb, { name: 'Agha Steel', phone: '021-111222333' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.balance).toBe(0);
      expect((result.data as any).type).toBeUndefined();
    }
  });

  it('rejects an empty name', () => {
    const result = create(testDb, { name: '' });
    expect(result.ok).toBe(false);
  });

  it('updates fields but silently ignores a caller-supplied balance', () => {
    const created = create(testDb, { name: 'Master Paints Supply' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = update(testDb, created.data.id, { address: 'Sheikhupura Road', balance: 9000 } as any);
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.data.address).toBe('Sheikhupura Road');
      expect(updated.data.balance).toBe(0);
    }
  });

  it('returns NOT_FOUND when updating a non-existent supplier', () => {
    const result = update(testDb, 999999, { name: 'Ghost Supplier' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('deletes a supplier', () => {
    const created = create(testDb, { name: 'Temporary Supplier' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) {
      expect(after.data.find((s) => s.id === created.data.id)).toBeUndefined();
    }
  });

  it('returns NOT_FOUND when deleting a non-existent supplier', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
