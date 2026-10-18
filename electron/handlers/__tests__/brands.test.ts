import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create, remove } from '../brands';

describe('brands handler (Task 2.1)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_brands.db');

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

  it('creates a brand', () => {
    const result = create(testDb, { name: 'Master Paints' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Master Paints');
      expect(result.data.id).toBeGreaterThan(0);
    }
  });

  it('rejects a missing name', () => {
    const result = create(testDb, {});
    expect(result.ok).toBe(false);
  });

  it('deletes a brand', () => {
    const created = create(testDb, { name: 'Temporary Brand' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) {
      expect(after.data.find((b) => b.id === created.data.id)).toBeUndefined();
    }
  });

  it('returns NOT_FOUND when deleting a non-existent brand', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
