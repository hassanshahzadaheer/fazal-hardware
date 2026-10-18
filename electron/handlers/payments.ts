import Database from 'better-sqlite3';
import { Result, Payment } from '../../shared/types';
import { PaymentPartyType, PaymentDirection, PaymentMode, PaymentReferenceType } from '../../shared/constants';
import { paymentCreateSchema } from '../../shared/schemas';

interface PaymentRow {
  id: number;
  party_type: string;
  party_id: number;
  party_name: string | null;
  amount: number;
  direction: string;
  mode: string;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: PaymentRow): Payment {
  return {
    id: row.id,
    partyType: row.party_type as PaymentPartyType,
    partyId: row.party_id,
    partyName: row.party_name,
    amount: row.amount,
    direction: row.direction as PaymentDirection,
    mode: row.mode as PaymentMode,
    referenceType: row.reference_type as PaymentReferenceType | null,
    referenceId: row.reference_id,
    notes: row.notes,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Payment[]> {
  const rows = db.prepare('SELECT * FROM payments ORDER BY created_date DESC, id DESC').all() as PaymentRow[];
  return { ok: true, data: rows.map(mapRow) };
}

// Manual payment creation (§11.3/§12.3/§14.5: Ledger Dialog "Receive/Record
// Payment", Credit Accounts "Receive Payment") — always reference_type 'general'.
// Payments created automatically during a sale/purchase are inserted directly
// by electron/handlers/sales.ts and purchases.ts, not through this function,
// since those are increasing an already-known paid amount rather than paying
// down an existing balance.
export function create(db: Database.Database, payload: unknown): Result<Payment> {
  const parsed = paymentCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;

  const paymentId = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO payments (party_type, party_id, party_name, amount, direction, mode, reference_type, reference_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        d.partyType,
        d.partyId,
        d.partyName ?? null,
        d.amount,
        d.direction,
        d.mode,
        d.referenceType ?? 'general',
        d.referenceId ?? null,
        d.notes ?? null
      );

    const table = d.partyType === 'customer' ? 'customers' : 'suppliers';
    db.prepare(`UPDATE ${table} SET balance = MAX(0, balance - ?), updated_date = datetime('now') WHERE id = ?`).run(
      d.amount,
      d.partyId
    );

    return info.lastInsertRowid as number;
  })();

  const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as PaymentRow;
  return { ok: true, data: mapRow(row) };
}
