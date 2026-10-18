import Database from 'better-sqlite3';
import { Result, Customer } from '../../shared/types';
import { CustomerType } from '../../shared/constants';
import { customerCreateSchema, customerUpdateSchema } from '../../shared/schemas';

interface CustomerRow {
  id: number;
  name: string;
  phone: string | null;
  type: string | null;
  address: string | null;
  balance: number;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type as CustomerType | null,
    address: row.address,
    balance: row.balance,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Customer[]> {
  const rows = db.prepare('SELECT * FROM customers ORDER BY name').all() as CustomerRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function create(db: Database.Database, payload: unknown): Result<Customer> {
  const parsed = customerCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const { name, phone, type, address } = parsed.data;
  // balance intentionally always starts at 0 — only Payments (Phase 6) change it.
  const info = db
    .prepare('INSERT INTO customers (name, phone, type, address, balance) VALUES (?, ?, ?, ?, 0)')
    .run(name, phone ?? null, type ?? null, address ?? null);
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid) as CustomerRow;
  return { ok: true, data: mapRow(row) };
}

export function update(db: Database.Database, id: number, payload: unknown): Result<Customer> {
  const existing = db.prepare('SELECT 1 FROM customers WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } };
  }

  const parsed = customerUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  // `balance` is not part of customerUpdateSchema, so it's silently stripped here —
  // it can only change via Payment records (Phase 6), never a direct edit.
  const d = parsed.data as Record<string, unknown>;
  const columnMap: Record<string, string> = { name: 'name', phone: 'phone', type: 'type', address: 'address' };

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (key in d) {
      fields.push(`${column} = ?`);
      values.push(d[key] ?? null);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_date = datetime('now')");
    db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }

  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow;
  return { ok: true, data: mapRow(row) };
}

export function remove(db: Database.Database, id: number): Result<null> {
  const existing = db.prepare('SELECT 1 FROM customers WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } };
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return { ok: true, data: null };
}
