import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, SlidersHorizontal, Clock, PackageSearch } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import StockAdjustDialog from './StockAdjustDialog';
import StockHistoryDialog from './StockHistoryDialog';
import { Badge, EmptyState, Input, Tooltip } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

export default function StockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [adjusting, setAdjusting] = useState<ProductWithNames | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ProductWithNames | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await window.api.products.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as ProductWithNames[];
    },
  });

  const isLowStock = (p: ProductWithNames) => p.reorderLevel !== null && p.stockOnHand <= p.reorderLevel;

  const totalValue = useMemo(
    () => (products ?? []).reduce((sum, p) => sum + p.stockOnHand * (p.costPrice ?? 0), 0),
    [products]
  );
  const lowStockCount = useMemo(() => (products ?? []).filter(isLowStock).length, [products]);

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (tab === 'low') list = list.filter(isLowStock);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.categoryName, p.brandName].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, search, tab]);

  const handleAdjusted = () => {
    setAdjusting(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-0.5">
        <h1 className="text-[22px] font-semibold text-ink tracking-tight">Stock Management</h1>
        {lowStockCount > 0 && <Badge tone="danger">{lowStockCount} low stock</Badge>}
      </div>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-4">Total inventory value: {formatPKR(totalValue)}</p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 border-b border-border">
          {(['all', 'low'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {key === 'all' ? 'All Stock' : 'Low Stock'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, or brand…"
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={tab === 'low' ? 'No products are low on stock' : 'No products yet'}
            description={tab === 'low' ? 'Everything is above its reorder level.' : 'Add products to start tracking stock levels.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Product</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Category</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">On Hand</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Reorder Level</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Value</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const low = isLowStock(p);
                  const ratio = p.reorderLevel ? Math.min(1, p.stockOnHand / (p.reorderLevel * 2 || 1)) : 1;
                  return (
                    <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{p.name}</div>
                        {p.brandName && <div className="text-xs text-ink-muted">{p.brandName}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{p.categoryName ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1.5 ${low ? 'text-danger font-medium' : 'text-ink'}`}>
                          {low && <AlertTriangle className="w-3.5 h-3.5" />}
                          {p.stockOnHand} {p.baseUnit}
                        </div>
                        <div className="w-24 h-1.5 bg-surface-sunken rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${low ? 'bg-danger' : 'bg-accent'}`}
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{p.reorderLevel ?? '—'}</td>
                      <td className="px-4 py-2.5 text-ink tabular-nums">{formatPKR(p.stockOnHand * (p.costPrice ?? 0))}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAdjusting(p)}
                            aria-label={`Adjust ${p.name}`}
                            className="flex items-center gap-1 text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Adjust
                          </button>
                          <Tooltip content="View stock movement history">
                            <button
                              onClick={() => setViewingHistory(p)}
                              aria-label={`History for ${p.name}`}
                              className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjusting && (
        <StockAdjustDialog product={adjusting} onClose={() => setAdjusting(null)} onSaved={handleAdjusted} />
      )}
      {viewingHistory && (
        <StockHistoryDialog product={viewingHistory} onClose={() => setViewingHistory(null)} />
      )}
    </div>
  );
}
