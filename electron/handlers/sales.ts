import Database from 'better-sqlite3';
import { Result, SaleInvoice, LineItem } from '../../shared/types';
import { DocPaymentMode, SaleStatus, PriceTier } from '../../shared/constants';
import { saleInvoiceCreateSchema } from '../../shared/schemas';
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
