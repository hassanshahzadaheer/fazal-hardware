import Database from 'better-sqlite3';
import { Result, DashboardData } from '../../shared/types';
import { list as listSales } from './sales';

// §6.2-§6.4: a single aggregated call backing the Home dashboard, rather than
// the renderer firing five separate queries on every load.
export function getDashboard(db: Database.Database): Result<DashboardData> {
  const { todayRevenue } = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) as todayRevenue FROM sale_invoices
       WHERE status != 'returned' AND date(created_date) = date('now')`
    )
    .get() as { todayRevenue: number };

  const { stockValue } = db
    .prepare('SELECT COALESCE(SUM(stock_on_hand * COALESCE(cost_price, 0)), 0) as stockValue FROM products')
    .get() as { stockValue: number };

  const { totalReceivable } = db
    .prepare('SELECT COALESCE(SUM(balance), 0) as totalReceivable FROM customers')
    .get() as { totalReceivable: number };

  const { totalPayable } = db
    .prepare('SELECT COALESCE(SUM(balance), 0) as totalPayable FROM suppliers')
    .get() as { totalPayable: number };

  const { lowStockCount } = db
    .prepare(
      'SELECT COUNT(*) as lowStockCount FROM products WHERE reorder_level IS NOT NULL AND stock_on_hand <= reorder_level'
    )
    .get() as { lowStockCount: number };

  const lowStockProducts = db
    .prepare(
      `SELECT id, name, stock_on_hand as stockOnHand, reorder_level as reorderLevel
       FROM products
       WHERE reorder_level IS NOT NULL AND stock_on_hand <= reorder_level
       ORDER BY (reorder_level - stock_on_hand) DESC
       LIMIT 5`
    )
    .all() as { id: number; name: string; stockOnHand: number; reorderLevel: number }[];

  const salesResult = listSales(db);
  const recentSales = salesResult.ok ? salesResult.data.slice(0, 6) : [];

  return {
    ok: true,
    data: {
      todayRevenue,
      stockValue,
      totalReceivable,
      totalPayable,
      lowStockCount,
      lowStockProducts,
      recentSales,
    },
  };
}
