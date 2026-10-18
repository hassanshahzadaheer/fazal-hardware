import Database from 'better-sqlite3';
import { Result, Brand } from '../../shared/types';
import { brandCreateSchema } from '../../shared/schemas';

interface BrandRow {
  id: number;
  name: string;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Brand[]> {
  const rows = db.prepare('SELECT * FROM brands ORDER BY name').all() as BrandRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function create(db: Database.Database, payload: unknown): Result<Brand> {
  const parsed = brandCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const info = db.prepare('INSERT INTO brands (name) VALUES (?)').run(parsed.data.name);
  const row = db.prepare('SELECT * FROM brands WHERE id = ?').get(info.lastInsertRowid) as BrandRow;
  return { ok: true, data: mapRow(row) };
}

export function remove(db: Database.Database, id: number): Result<null> {
  const existing = db.prepare('SELECT 1 FROM brands WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } };
  }
  db.prepare('DELETE FROM brands WHERE id = ?').run(id);
  return { ok: true, data: null };
}
