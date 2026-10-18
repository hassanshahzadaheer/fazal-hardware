import Database from 'better-sqlite3';
import { Result, Expense } from '../../shared/types';
import { ExpensePaymentMode } from '../../shared/constants';
import { expenseCreateSchema, expenseUpdateSchema } from '../../shared/schemas';

interface ExpenseRow {
  id: number;
  date: string;
  expense_head: string;
  description: string | null;
  amount: number;
  payment_mode: string;
  reference: string | null;
  notes: string | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    expenseHead: row.expense_head,
    description: row.description,
    amount: row.amount,
    paymentMode: row.payment_mode as ExpensePaymentMode,
    reference: row.reference,
    notes: row.notes,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Expense[]> {
  const rows = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all() as ExpenseRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function create(db: Database.Database, payload: unknown): Result<Expense> {
  const parsed = expenseCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;
  const info = db
    .prepare(
      `INSERT INTO expenses (date, expense_head, description, amount, payment_mode, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(d.date, d.expenseHead, d.description ?? null, d.amount, d.paymentMode, d.reference ?? null, d.notes ?? null);
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid) as ExpenseRow;
  return { ok: true, data: mapRow(row) };
}

const UPDATE_COLUMN_MAP: Record<string, string> = {
  date: 'date',
  expenseHead: 'expense_head',
  description: 'description',
  amount: 'amount',
  paymentMode: 'payment_mode',
  reference: 'reference',
  notes: 'notes',
};

export function update(db: Database.Database, id: number, payload: unknown): Result<Expense> {
  const existing = db.prepare('SELECT 1 FROM expenses WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  }

  const parsed = expenseUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data as Record<string, unknown>;

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP)) {
    if (key in d) {
      fields.push(`${column} = ?`);
      values.push(d[key] ?? null);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_date = datetime('now')");
    db.prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }

  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as ExpenseRow;
  return { ok: true, data: mapRow(row) };
}

export function remove(db: Database.Database, id: number): Result<null> {
  const existing = db.prepare('SELECT 1 FROM expenses WHERE id = ?').get(id);
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return { ok: true, data: null };
}
