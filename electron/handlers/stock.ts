import Database from 'better-sqlite3';
import { Result, StockMovement } from '../../shared/types';
import { StockMovementType, StockMovementReferenceType } from '../../shared/constants';

interface StockMovementRow {
  id: number;
  product_id: number;
  type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  cost_price_at_time: number | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    type: row.type as StockMovementType,
    quantity: row.quantity,
    referenceType: row.reference_type as StockMovementReferenceType | null,
    referenceId: row.reference_id,
    notes: row.notes,
    costPriceAtTime: row.cost_price_at_time,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export interface AdjustPayload {
  productId: number;
  type: 'adjustment' | 'wastage' | 'opening';
  quantity: number;
  notes?: string | null;
}

// §8.3 sign rules: adjustment keeps the caller's sign, wastage is always
// subtracted, opening is always added — regardless of what sign the caller sent.
export function adjust(db: Database.Database, payload: AdjustPayload): Result<StockMovement> {
  const product = db
    .prepare('SELECT id, cost_price FROM products WHERE id = ?')
    .get(payload.productId) as { id: number; cost_price: number | null } | undefined;
  if (!product) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Product not found' } };
  }
  if (!payload.quantity) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Quantity cannot be zero' } };
  }

  let actualQty: number;
  if (payload.type === 'wastage') {
    actualQty = -Math.abs(payload.quantity);
  } else if (payload.type === 'opening') {
    actualQty = Math.abs(payload.quantity);
  } else {
    actualQty = payload.quantity;
  }

  const insertedId = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id, notes, cost_price_at_time)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(payload.productId, payload.type, actualQty, payload.type, payload.notes ?? null, product.cost_price);

    db.prepare(
      `UPDATE products SET stock_on_hand = stock_on_hand + ?, updated_date = datetime('now') WHERE id = ?`
    ).run(actualQty, payload.productId);

    return info.lastInsertRowid;
  })();

  const row = db.prepare('SELECT * FROM stock_movements WHERE id = ?').get(insertedId) as StockMovementRow;
  return { ok: true, data: mapRow(row) };
}

export function history(db: Database.Database, productId: number): Result<StockMovement[]> {
  const rows = db
    .prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_date DESC, id DESC')
    .all(productId) as StockMovementRow[];
  return { ok: true, data: rows.map(mapRow) };
}

// Used by Sales (Phase 4) and Purchases (Phase 5) handlers to record a movement
// tied to a document, inside the same db.transaction() as the document write —
// callers pass an already-open transaction's `db` handle, not a new connection.
export function recordMovement(
  db: Database.Database,
  params: {
    productId: number;
    type: StockMovementType;
    quantity: number;
    referenceType: StockMovementReferenceType;
    referenceId: number;
    costPriceAtTime: number | null;
    notes?: string | null;
  }
): void {
  db.prepare(
    `INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id, cost_price_at_time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.productId,
    params.type,
    params.quantity,
    params.referenceType,
    params.referenceId,
    params.costPriceAtTime,
    params.notes ?? null
  );
}
