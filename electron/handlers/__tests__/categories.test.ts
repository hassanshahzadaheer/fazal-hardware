import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { ensureProductCategories, list, create, remove } from '../categories';

describe('categories handler (Task 2.1)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_categories.db');

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

  it('creates a category and returns it with camelCase fields', () => {
    const result = create(testDb, { name: 'Sanitary' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe('Sanitary');
      expect(result.data.id).toBeGreaterThan(0);
      expect(result.data.parentId).toBeNull();
    }
  });

  it('rejects an empty name', () => {
    const result = create(testDb, { name: '' });
    expect(result.ok).toBe(false);
  });

  it('supports a parent category (subcategories)', () => {
    const parent = create(testDb, { name: 'Plywood' });
    expect(parent.ok).toBe(true);
    if (!parent.ok) return;

    const child = create(testDb, { name: 'Commercial Plywood', parentId: parent.data.id });
    expect(child.ok).toBe(true);
    if (child.ok) expect(child.data.parentId).toBe(parent.data.id);
  });

  it('lists all created categories', () => {
    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.length).toBeGreaterThanOrEqual(3);
  });

  it('deletes a category', () => {
    const created = create(testDb, { name: 'Temporary Category' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) {
      expect(after.data.find((c) => c.id === created.data.id)).toBeUndefined();
    }
  });

  it('returns NOT_FOUND when deleting a non-existent category', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('ensureProductCategories adds Wood/Plywood/Hardware once and leaves other categories alone', () => {
    create(testDb, { name: 'Legacy Paint' });
    ensureProductCategories(testDb);
    ensureProductCategories(testDb); // idempotent
    const res = list(testDb);
    if (!res.ok) throw new Error('list failed');
    const names = res.data.map((c) => c.name);
    for (const n of ['Wood', 'Plywood', 'Hardware', 'Legacy Paint']) {
      expect(names.filter((x) => x === n)).toHaveLength(1);
    }
  });
});
