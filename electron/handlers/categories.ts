import Database from 'better-sqlite3';
import { Result, Category } from '../../shared/types';
import { categoryCreateSchema } from '../../shared/schemas';
import { PRODUCT_CATEGORIES } from '../../shared/constants';

interface CategoryRow {
  id: number;
  name: string;
  parent_id: number | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Category[]> {
  const rows = db.prepare('SELECT * FROM categories ORDER BY name').all() as CategoryRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function create(db: Database.Database, payload: unknown): Result<Category> {
  const parsed = categoryCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const { name, parentId } = parsed.data;
  const info = db.prepare('INSERT INTO categories (name, parent_id) VALUES (?, ?)').run(name, parentId ?? null);
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) as CategoryRow;
  return { ok: true, data: mapRow(row) };
}

export function remove(db: Database.Database, id: number): Result<null> {
  const existing = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Category not found' } };
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { ok: true, data: null };
}

// Client call 2026-11-14: the Product screen offers exactly Wood / Plywood / Hardware. Called once at
// app start (not from a migration, so a fresh DB in tests still starts empty). Existing categories and
// the products pointing at them are never touched.
export function ensureProductCategories(db: Database.Database): void {
  const exists = db.prepare('SELECT 1 FROM categories WHERE lower(name) = lower(?)');
  const insert = db.prepare('INSERT INTO categories (name) VALUES (?)');
  for (const name of PRODUCT_CATEGORIES) {
    if (!exists.get(name)) insert.run(name);
  }
}
