import Database from 'better-sqlite3';
import { Result, PurchaseOrder, PurchaseLineItem } from '../../shared/types';
import { DocPaymentMode, PurchaseStatus } from '../../shared/constants';
import { purchaseOrderCreateSchema } from '../../shared/schemas';
import { generatePONumber } from '../lib/sequences';
import { recordMovement } from './stock';

interface PurchaseOrderRow {
  id: number;
  po_number: string;
  supplier_id: number | null;
  supplier_name: string | null;
  items: string;
  subtotal: number;
  freight_amount: number;
  total: number;
  paid_amount: number;
  payment_mode: string | null;
  status: string;
  notes: string | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: PurchaseOrderRow): PurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    items: JSON.parse(row.items) as PurchaseLineItem[],
    subtotal: row.subtotal,
    freightAmount: row.freight_amount,
    total: row.total,
    paidAmount: row.paid_amount,
    paymentMode: row.payment_mode as DocPaymentMode | null,
    status: row.status as PurchaseStatus,
    notes: row.notes,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<PurchaseOrder[]> {
  const rows = db
    .prepare('SELECT * FROM purchase_orders ORDER BY created_date DESC, id DESC')
    .all() as PurchaseOrderRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function get(db: Database.Database, id: number): Result<PurchaseOrder> {
  const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as PurchaseOrderRow | undefined;
  if (!row) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } };
  }
  return { ok: true, data: mapRow(row) };
}

// §10.3: positive StockMovement + stock increment + products.cost_price updated
// to the latest purchase price; supplier balance increase if unpaid; Payment if
// paid > 0. No dimensional selling, no per-line discount (§10.2) — purchases are
// simpler than sales on those two axes.
export function create(db: Database.Database, payload: unknown): Result<PurchaseOrder> {
  const parsed = purchaseOrderCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;

  const paid = d.paymentMode === 'credit' ? 0 : d.paymentMode === 'partial' ? d.paidAmount : d.total;
  const status: PurchaseStatus = paid >= d.total ? 'received' : paid > 0 ? 'partial' : 'credit';

  try {
    const poId = db.transaction(() => {
      const poNumber = generatePONumber(db);

      const info = db
        .prepare(
          `INSERT INTO purchase_orders (
            po_number, supplier_id, supplier_name, items, subtotal, freight_amount,
            total, paid_amount, payment_mode, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          poNumber,
          d.supplierId ?? null,
          d.supplierName ?? null,
          JSON.stringify(d.items),
          d.subtotal,
          d.freightAmount,
          d.total,
          paid,
          d.paymentMode ?? null,
          status,
          d.notes ?? null
        );
      const newPoId = info.lastInsertRowid as number;

      for (const item of d.items) {
        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(item.productId) as
          | { id: number }
          | undefined;
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        recordMovement(db, {
          productId: item.productId,
          type: 'purchase',
          quantity: Math.abs(item.quantity),
          referenceType: 'purchase_order',
          referenceId: newPoId,
          costPriceAtTime: item.unitPrice,
        });
        db.prepare(
          `UPDATE products SET stock_on_hand = stock_on_hand + ?, cost_price = ?, updated_date = datetime('now') WHERE id = ?`
        ).run(Math.abs(item.quantity), item.unitPrice, item.productId);
      }

      if (d.supplierId && status !== 'received') {
        db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(d.total - paid, d.supplierId);
      }

      if (paid > 0 && d.supplierId) {
        db.prepare(
          `INSERT INTO payments (party_type, party_id, party_name, amount, direction, mode, reference_type, reference_id)
           VALUES ('supplier', ?, ?, ?, 'paid', ?, 'purchase_order', ?)`
        ).run(d.supplierId, d.supplierName ?? null, paid, d.paymentMode === 'partial' ? 'cash' : d.paymentMode, newPoId);
      }

      return newPoId;
    })();

    const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId) as PurchaseOrderRow;
    return { ok: true, data: mapRow(row) };
  } catch (err: any) {
    return { ok: false, error: { code: 'TRANSACTION_FAILED', message: err.message ?? 'Failed to create purchase' } };
  }
}
