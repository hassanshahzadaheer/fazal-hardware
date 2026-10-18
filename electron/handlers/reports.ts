import Database from 'better-sqlite3';
import { Result, ReportSummary, SalesByDay, TopProduct, LowStockRow, BalanceRow } from '../../shared/types';

// §17.1, with the §26.2 known-gap fix: gross profit uses cost_price_at_time
// from each sale's stock_movements row, not the product's current cost_price
// (which may have changed since via a later purchase).
export function getSummary(db: Database.Database): Result<ReportSummary> {
  const { totalRevenue } = db
    .prepare("SELECT COALESCE(SUM(total), 0) as totalRevenue FROM sale_invoices WHERE status != 'returned'")
    .get() as { totalRevenue: number };

  const { totalCost } = db
    .prepare(
      `SELECT COALESCE(SUM(ABS(quantity) * COALESCE(cost_price_at_time, 0)), 0) as totalCost
       FROM stock_movements WHERE type = 'sale'`
    )
    .get() as { totalCost: number };

  const { stockValue } = db
    .prepare('SELECT COALESCE(SUM(stock_on_hand * COALESCE(cost_price, 0)), 0) as stockValue FROM products')
    .get() as { stockValue: number };

  const { lowStockCount } = db
    .prepare(
      'SELECT COUNT(*) as lowStockCount FROM products WHERE reorder_level IS NOT NULL AND stock_on_hand <= reorder_level'
    )
    .get() as { lowStockCount: number };

  const { totalReceivable } = db
    .prepare('SELECT COALESCE(SUM(balance), 0) as totalReceivable FROM customers')
    .get() as { totalReceivable: number };

  const { totalPayable } = db
    .prepare('SELECT COALESCE(SUM(balance), 0) as totalPayable FROM suppliers')
    .get() as { totalPayable: number };

  return {
    ok: true,
    data: {
      totalRevenue,
      totalCost,
      grossProfit: totalRevenue - totalCost,
      stockValue,
      lowStockCount,
      totalReceivable,
      totalPayable,
    },
  };
}

export function getSalesByDay(db: Database.Database, days = 7): Result<SalesByDay[]> {
  const rows = db
    .prepare(
      `SELECT substr(created_date, 1, 10) as date, SUM(total) as revenue
       FROM sale_invoices
       WHERE status != 'returned' AND created_date >= datetime('now', ?)
       GROUP BY date
       ORDER BY date ASC`
    )
    .all(`-${days} days`) as SalesByDay[];
  return { ok: true, data: rows };
}

// Aggregated in JS from each invoice's stored items JSON rather than SQL JSON
// functions — simpler and plenty fast at shop-scale transaction volumes.
export function getTopProducts(db: Database.Database, limit = 20): Result<TopProduct[]> {
  const invoices = db
    .prepare("SELECT items FROM sale_invoices WHERE status != 'returned'")
    .all() as { items: string }[];

  const byProduct = new Map<number, TopProduct>();
  for (const inv of invoices) {
    const items = JSON.parse(inv.items) as { productId: number; productName: string; quantity: number; lineTotal: number }[];
    for (const item of items) {
      const existing = byProduct.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        qtySold: 0,
        revenue: 0,
      };
      existing.qtySold += item.quantity;
      existing.revenue += item.lineTotal;
      byProduct.set(item.productId, existing);
    }
  }

  const data = Array.from(byProduct.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
  return { ok: true, data };
}

export function getLowStock(db: Database.Database): Result<LowStockRow[]> {
  const rows = db
    .prepare(
      `SELECT id, name, stock_on_hand as stockOnHand, reorder_level as reorderLevel
       FROM products
       WHERE reorder_level IS NOT NULL AND stock_on_hand <= reorder_level
       ORDER BY (reorder_level - stock_on_hand) DESC`
    )
    .all() as { id: number; name: string; stockOnHand: number; reorderLevel: number }[];
  return { ok: true, data: rows.map((r) => ({ ...r, deficit: r.reorderLevel - r.stockOnHand })) };
}

export function getReceivables(db: Database.Database): Result<BalanceRow[]> {
  const rows = db
    .prepare('SELECT id, name, phone, balance FROM customers WHERE balance > 0 ORDER BY balance DESC')
    .all() as BalanceRow[];
  return { ok: true, data: rows };
}

export function getPayables(db: Database.Database): Result<BalanceRow[]> {
  const rows = db
    .prepare('SELECT id, name, phone, balance FROM suppliers WHERE balance > 0 ORDER BY balance DESC')
    .all() as BalanceRow[];
  return { ok: true, data: rows };
}
