import Database from 'better-sqlite3';
import { Result, Quotation, LineItem } from '../../shared/types';
import { QuotationStatus } from '../../shared/constants';
import { quotationCreateSchema } from '../../shared/schemas';
import { generateQuotationNumber } from '../lib/sequences';

interface QuotationRow {
  id: number;
  quotation_number: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  remarks: string | null;
  items: string;
  subtotal: number;
  discount_amount: number;
  freight_amount: number;
  total: number;
  status: string;
  converted_to_invoice_id: number | null;
  valid_until: string | null;
  notes: string | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: QuotationRow): Quotation {
  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    remarks: row.remarks,
    items: JSON.parse(row.items) as LineItem[],
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    freightAmount: row.freight_amount,
    total: row.total,
    status: row.status as QuotationStatus,
    convertedToInvoiceId: row.converted_to_invoice_id,
    validUntil: row.valid_until,
    notes: row.notes,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<Quotation[]> {
  const rows = db
    .prepare('SELECT * FROM quotations ORDER BY created_date DESC, id DESC')
    .all() as QuotationRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function get(db: Database.Database, id: number): Result<Quotation> {
  const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(id) as QuotationRow | undefined;
  if (!row) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } };
  }
  return { ok: true, data: mapRow(row) };
}

export function create(db: Database.Database, payload: unknown): Result<Quotation> {
  const parsed = quotationCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;

  const quotationNumber = generateQuotationNumber(db);
  const info = db
    .prepare(
      `INSERT INTO quotations (
        quotation_number, customer_id, customer_name, customer_phone, remarks, items,
        subtotal, discount_amount, freight_amount, total, status, valid_until, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    )
    .run(
      quotationNumber,
      d.customerId ?? null,
      d.customerName ?? null,
      d.customerPhone ?? null,
      d.remarks ?? null,
      JSON.stringify(d.items),
      d.subtotal,
      d.discountAmount,
      d.freightAmount,
      d.total,
      d.validUntil ?? null,
      d.notes ?? null
    );

  const row = db.prepare('SELECT * FROM quotations WHERE id = ?').get(info.lastInsertRowid) as QuotationRow;
  return { ok: true, data: mapRow(row) };
}
