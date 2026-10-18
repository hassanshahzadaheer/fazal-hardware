import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { list, create, update, remove } from '../products';
import { create as createCategory } from '../categories';
import { create as createBrand } from '../brands';

describe('products handler (Task 2.2)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_products.db');

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

  it('rejects an invalid base_unit', () => {
    const result = create(testDb, { name: 'Mystery Item', baseUnit: 'cubit' });
    expect(result.ok).toBe(false);
  });

  it('creates a product with stock_on_hand starting at 0 and is_active true', () => {
    const result = create(testDb, { name: 'PVC Pipe 1/2 inch', baseUnit: 'piece', retailPrice: 150 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.stockOnHand).toBe(0);
      expect(result.data.isActive).toBe(true);
      expect(result.data.retailPrice).toBe(150);
    }
  });

  it('round-trips variantAttributes as JSON', () => {
    const result = create(testDb, {
      name: 'Plywood Commercial 18mm',
      baseUnit: 'sheet',
      variantAttributes: { thickness: '18mm', grade: 'Commercial' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.variantAttributes).toEqual({ thickness: '18mm', grade: 'Commercial' });
    }
  });

  it('includes joined category and brand names in list()', () => {
    const category = createCategory(testDb, { name: 'Plywood' });
    const brand = createBrand(testDb, { name: 'Century Ply' });
    expect(category.ok && brand.ok).toBe(true);
    if (!category.ok || !brand.ok) return;

    const created = create(testDb, {
      name: 'Plywood MR Grade',
      baseUnit: 'sheet',
      categoryId: category.data.id,
      brandId: brand.data.id,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = list(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const found = result.data.find((p) => p.id === created.data.id);
      expect(found?.categoryName).toBe('Plywood');
      expect(found?.brandName).toBe('Century Ply');
    }
  });

  it('a product with no category/brand has null names, not a join failure', () => {
    const created = create(testDb, { name: 'Loose Screw', baseUnit: 'piece' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = list(testDb);
    if (result.ok) {
      const found = result.data.find((p) => p.id === created.data.id);
      expect(found?.categoryName).toBeNull();
      expect(found?.brandName).toBeNull();
    }
  });

  it('updates only the fields provided, leaving the rest untouched', () => {
    const created = create(testDb, { name: 'Cement Bag', baseUnit: 'bag', costPrice: 1200, retailPrice: 1400 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = update(testDb, created.data.id, { retailPrice: 1450 });
    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.data.retailPrice).toBe(1450);
      expect(updated.data.costPrice).toBe(1200); // untouched
      expect(updated.data.name).toBe('Cement Bag'); // untouched
    }
  });

  it('returns NOT_FOUND when updating a non-existent product', () => {
    const result = update(testDb, 999999, { retailPrice: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });

  it('deletes a product', () => {
    const created = create(testDb, { name: 'Temporary Product', baseUnit: 'piece' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const deleted = remove(testDb, created.data.id);
    expect(deleted.ok).toBe(true);

    const after = list(testDb);
    if (after.ok) {
      expect(after.data.find((p) => p.id === created.data.id)).toBeUndefined();
    }
  });

  it('returns NOT_FOUND when deleting a non-existent product', () => {
    const result = remove(testDb, 999999);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND');
  });
});
