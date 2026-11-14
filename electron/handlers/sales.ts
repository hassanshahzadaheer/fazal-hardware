import Database from 'better-sqlite3';
import { Result, SaleInvoice, LineItem } from '../../shared/types';
import { DocPaymentMode, SaleStatus, PriceTier } from '../../shared/constants';
import { saleInvoiceCreateSchema, saleInvoiceUpdateSchema } from '../../shared/schemas';
import { generateInvoiceNumber } from '../lib/sequences';
import { recordMovement } from './stock';

interface SaleInvoiceRow {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string | null;
  items: string;
  subtotal: number;
  discount_amount: number;
  freight_amount: number;
  total: number;
  paid_amount: number;
  payment_mode: string | null;
  status: string;
  price_tier: string;
  quotation_id: number | null;
  notes: string | null;
  created_date: string;
  updated_date: string;
  created_by_id: number | null;
}

function mapRow(row: SaleInvoiceRow): SaleInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    items: JSON.parse(row.items) as LineItem[],
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    freightAmount: row.freight_amount,
    total: row.total,
    paidAmount: row.paid_amount,
    paymentMode: row.payment_mode as DocPaymentMode | null,
    status: row.status as SaleStatus,
    priceTier: row.price_tier as PriceTier,
    quotationId: row.quotation_id,
    notes: row.notes,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
    createdById: row.created_by_id,
  };
}

export function list(db: Database.Database): Result<SaleInvoice[]> {
  const rows = db
    .prepare('SELECT * FROM sale_invoices ORDER BY created_date DESC, id DESC')
    .all() as SaleInvoiceRow[];
  return { ok: true, data: rows.map(mapRow) };
}

export function get(db: Database.Database, id: number): Result<SaleInvoice> {
  const row = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(id) as SaleInvoiceRow | undefined;
  if (!row) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Sale invoice not found' } };
  }
  return { ok: true, data: mapRow(row) };
}

// §9.3 submission logic: invoice -> per-line StockMovement + stock decrement ->
// customer balance increase if unpaid -> Payment record if paid > 0. All in one
// transaction since a partial failure here would leave stock/balances wrong.
export function create(db: Database.Database, payload: unknown): Result<SaleInvoice> {
  const parsed = saleInvoiceCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;

  const paid = d.paymentMode === 'credit' ? 0 : d.paymentMode === 'partial' ? d.paidAmount : d.total;
  const status: SaleStatus = paid >= d.total ? 'completed' : paid > 0 ? 'partial' : 'credit';

  try {
    const invoiceId = db.transaction(() => {
      const invoiceNumber = generateInvoiceNumber(db);

      const info = db
        .prepare(
          `INSERT INTO sale_invoices (
            invoice_number, customer_id, customer_name, items, subtotal, discount_amount,
            freight_amount, total, paid_amount, payment_mode, status, price_tier, quotation_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          invoiceNumber,
          d.customerId ?? null,
          d.customerName ?? null,
          JSON.stringify(d.items),
          d.subtotal,
          d.discountAmount,
          d.freightAmount,
          d.total,
          paid,
          d.paymentMode ?? null,
          status,
          d.priceTier,
          d.quotationId ?? null,
          d.notes ?? null
        );
      const newInvoiceId = info.lastInsertRowid as number;

      for (const item of d.items) {
        const product = db
          .prepare('SELECT cost_price FROM products WHERE id = ?')
          .get(item.productId) as { cost_price: number | null } | undefined;
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        // Stock tracks piece/sheet count (item.quantity), not the L×W effective
        // area used for pricing — a dimensional sale still moves whole units.
        recordMovement(db, {
          productId: item.productId,
          type: 'sale',
          quantity: -Math.abs(item.quantity),
          referenceType: 'sale_invoice',
          referenceId: newInvoiceId,
          costPriceAtTime: product.cost_price,
        });
        db.prepare('UPDATE products SET stock_on_hand = stock_on_hand - ? WHERE id = ?').run(
          Math.abs(item.quantity),
          item.productId
        );
      }

      if (d.customerId && status !== 'completed') {
        db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(d.total - paid, d.customerId);
      }

      if (paid > 0 && d.customerId) {
        db.prepare(
          `INSERT INTO payments (party_type, party_id, party_name, amount, direction, mode, reference_type, reference_id)
           VALUES ('customer', ?, ?, ?, 'received', ?, 'sale_invoice', ?)`
        ).run(d.customerId, d.customerName ?? null, paid, d.paymentMode === 'partial' ? 'cash' : d.paymentMode, newInvoiceId);
      }

      // §15.5 / §26.2 known-gap fix: the legacy app navigated to New Sale with
      // quotation data but never actually linked the resulting invoice back to
      // the quotation or flipped its status — both happen here, atomically with
      // the invoice itself, so it's impossible to get one without the other.
      if (d.quotationId) {
        const quotation = db.prepare('SELECT status FROM quotations WHERE id = ?').get(d.quotationId) as
          | { status: string }
          | undefined;
        if (!quotation) {
          throw new Error(`Quotation ${d.quotationId} not found`);
        }
        if (quotation.status === 'converted') {
          throw new Error(`Quotation ${d.quotationId} has already been converted`);
        }
        db.prepare(
          `UPDATE quotations SET status = 'converted', converted_to_invoice_id = ?, updated_date = datetime('now') WHERE id = ?`
        ).run(newInvoiceId, d.quotationId);
      }

      return newInvoiceId;
    })();

    const row = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(invoiceId) as SaleInvoiceRow;
    return { ok: true, data: mapRow(row) };
  } catch (err: any) {
    return { ok: false, error: { code: 'TRANSACTION_FAILED', message: err.message ?? 'Failed to create sale' } };
  }
}

export interface ReturnItem {
  productId: number;
  quantity: number;
}

// §9.6: per returned item, positive StockMovement + stock increment; invoice
// status -> 'returned'; if a customer was linked, decrease their balance by the
// return total — this matches the PRD literally even for an already-fully-paid
// invoice (balance can go negative in that case). Not listed among the known
// gaps in §26.2, so left as specified rather than "fixed" unprompted.
export function returnSale(
  db: Database.Database,
  invoiceId: number,
  items: ReturnItem[],
  notes?: string | null
): Result<SaleInvoice> {
  const invoiceRow = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(invoiceId) as
    | SaleInvoiceRow
    | undefined;
  if (!invoiceRow) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Sale invoice not found' } };
  }
  if (invoiceRow.status === 'returned') {
    return { ok: false, error: { code: 'ALREADY_RETURNED', message: 'This invoice has already been returned' } };
  }

  const soldItems = JSON.parse(invoiceRow.items) as LineItem[];

  try {
    db.transaction(() => {
      let returnTotal = 0;

      for (const ret of items) {
        if (ret.quantity <= 0) continue;
        const sold = soldItems.find((li) => li.productId === ret.productId);
        if (!sold) throw new Error(`Product ${ret.productId} was not part of this invoice`);
        if (ret.quantity > sold.quantity) {
          throw new Error(`Cannot return more than was sold for product ${ret.productId}`);
        }

        const product = db
          .prepare('SELECT cost_price FROM products WHERE id = ?')
          .get(ret.productId) as { cost_price: number | null } | undefined;

        recordMovement(db, {
          productId: ret.productId,
          type: 'sale_return',
          quantity: Math.abs(ret.quantity),
          referenceType: 'sale_return',
          referenceId: invoiceId,
          costPriceAtTime: product?.cost_price ?? null,
          notes: notes ?? null,
        });
        db.prepare('UPDATE products SET stock_on_hand = stock_on_hand + ? WHERE id = ?').run(
          Math.abs(ret.quantity),
          ret.productId
        );

        const unitValue = sold.lineTotal / sold.quantity;
        returnTotal += unitValue * ret.quantity;
      }

      db.prepare(`UPDATE sale_invoices SET status = 'returned', updated_date = datetime('now') WHERE id = ?`).run(
        invoiceId
      );

      if (invoiceRow.customer_id) {
        db.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(
          returnTotal,
          invoiceRow.customer_id
        );
      }
    })();
  } catch (err: any) {
    return { ok: false, error: { code: 'TRANSACTION_FAILED', message: err.message ?? 'Failed to process return' } };
  }

  const row = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(invoiceId) as SaleInvoiceRow;
  return { ok: true, data: mapRow(row) };
}

// Edit an existing sale (client call 2026-11-14): replace lines / discount / freight and keep
// stock, customer balance and the payment record consistent with the new totals, atomically.
//  - Stock: per product, the change in sold quantity is applied as an 'adjustment' movement
//    (sold more -> stock down, sold less / line deleted -> stock back up).
//  - Paid amount: cash/card sales stay fully paid at the new total; credit stays 0; partial keeps
//    what was paid (capped at the new total).
//  - Customer balance moves by the change in the unpaid amount.
export function update(db: Database.Database, id: number, payload: unknown): Result<SaleInvoice> {
  const existing = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(id) as SaleInvoiceRow | undefined;
  if (!existing) {
    return { ok: false, error: { code: 'NOT_FOUND', message: 'Sale invoice not found' } };
  }
  if (existing.status === 'returned') {
    return { ok: false, error: { code: 'ALREADY_RETURNED', message: 'A returned sale cannot be edited' } };
  }
  const parsed = saleInvoiceUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const d = parsed.data;

  const subtotal = d.items.reduce((sum, li) => sum + li.lineTotal, 0);
  const total = subtotal - d.discountAmount + d.freightAmount;
  if (total < 0) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Discount cannot exceed the sale total' } };
  }

  const mode = existing.payment_mode as DocPaymentMode | null;
  const paid = mode === 'credit' ? 0 : mode === 'partial' ? Math.min(existing.paid_amount, total) : total;
  const status: SaleStatus = paid >= total ? 'completed' : paid > 0 ? 'partial' : 'credit';

  try {
    db.transaction(() => {
      const oldItems = JSON.parse(existing.items) as LineItem[];
      const qtyByProduct = (items: LineItem[]) => {
        const m = new Map<number, number>();
        for (const li of items) m.set(li.productId, (m.get(li.productId) ?? 0) + Math.abs(li.quantity));
        return m;
      };
      const before = qtyByProduct(oldItems);
      const after = qtyByProduct(d.items);

      for (const productId of new Set([...before.keys(), ...after.keys()])) {
        const delta = (after.get(productId) ?? 0) - (before.get(productId) ?? 0);
        if (delta === 0) continue;
        const product = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(productId) as
          | { cost_price: number | null }
          | undefined;
        if (!product) throw new Error(`Product ${productId} not found`);
        recordMovement(db, {
          productId,
          type: 'adjustment',
          quantity: -delta,
          referenceType: 'sale_invoice',
          referenceId: id,
          costPriceAtTime: product.cost_price,
          notes: 'Sale edited',
        });
        db.prepare('UPDATE products SET stock_on_hand = stock_on_hand - ? WHERE id = ?').run(delta, productId);
      }

      db.prepare(
        `UPDATE sale_invoices SET items = ?, subtotal = ?, discount_amount = ?, freight_amount = ?, total = ?,
           paid_amount = ?, status = ?, notes = COALESCE(?, notes), updated_date = datetime('now') WHERE id = ?`
      ).run(JSON.stringify(d.items), subtotal, d.discountAmount, d.freightAmount, total, paid, status, d.notes ?? null, id);

      if (existing.customer_id) {
        const unpaidDelta = total - paid - (existing.total - existing.paid_amount);
        if (unpaidDelta !== 0) {
          db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(unpaidDelta, existing.customer_id);
        }

        const payment = db
          .prepare(
            `SELECT id FROM payments WHERE reference_type = 'sale_invoice' AND reference_id = ? AND direction = 'received'
             ORDER BY id LIMIT 1`
          )
          .get(id) as { id: number } | undefined;
        if (payment && paid > 0) {
          db.prepare(`UPDATE payments SET amount = ?, updated_date = datetime('now') WHERE id = ?`).run(paid, payment.id);
        } else if (payment) {
          db.prepare('DELETE FROM payments WHERE id = ?').run(payment.id);
        } else if (paid > 0) {
          db.prepare(
            `INSERT INTO payments (party_type, party_id, party_name, amount, direction, mode, reference_type, reference_id)
             VALUES ('customer', ?, ?, ?, 'received', ?, 'sale_invoice', ?)`
          ).run(existing.customer_id, existing.customer_name, paid, mode === 'partial' ? 'cash' : mode ?? 'cash', id);
        }
      }
    })();
  } catch (err: any) {
    return { ok: false, error: { code: 'TRANSACTION_FAILED', message: err.message ?? 'Failed to update sale' } };
  }

  const row = db.prepare('SELECT * FROM sale_invoices WHERE id = ?').get(id) as SaleInvoiceRow;
  return { ok: true, data: mapRow(row) };
}
