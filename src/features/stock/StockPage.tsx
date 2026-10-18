import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Clock, PackageSearch } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import StockAdjustDialog from './StockAdjustDialog';
import StockHistoryDialog from './StockHistoryDialog';
import { Badge, EmptyState, PageHeader, Toolbar, Tooltip, Pagination } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

// A small rotating palette gives each row a tiny bit of visual identity —
// deterministic per product id, not random, so it doesn't reshuffle on
// every re-render/refetch.
const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
  'bg-surface-sunken text-ink-muted',
];

export default function StockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [adjusting, setAdjusting] = useState<ProductWithNames | null>(null);
  const [viewingHistory, setViewingHistory] = useState<ProductWithNames | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleAdjusted = () => {
    setAdjusting(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <div className="p-8">
      <PageHeader title="Stock Management" subtitle={`Total inventory value: ${formatPKR(totalValue)}`}>
        {lowStockCount > 0 && <Badge tone="danger">{lowStockCount} low stock</Badge>}
      </PageHeader>

      <div className="flex gap-1 border-b border-border mb-4">
        {(['all', 'low'] as const).map((key) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {key === 'all' ? 'All Stock' : 'Low Stock'}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name, category, or brand…"
        />
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={tab === 'low' ? 'No products are low on stock' : 'No products yet'}
            description={tab === 'low' ? 'Everything is above its reorder level.' : 'Add products to start tracking stock levels.'}
          />
        ) : (
          <>
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
                {paged.map((p) => {
                  const low = isLowStock(p);
                  const ratio = p.reorderLevel ? Math.min(1, p.stockOnHand / (p.reorderLevel * 2 || 1)) : 1;
                  const tone = AVATAR_TONES[p.id % AVATAR_TONES.length];
                  return (
                    <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-semibold shrink-0 ${tone}`}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-ink truncate">{p.name}</div>
                            {p.brandName && <div className="text-xs text-ink-muted truncate">{p.brandName}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.categoryName ? <Badge tone="neutral">{p.categoryName}</Badge> : <span className="text-ink-faint">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${low ? 'bg-danger' : 'bg-success'}`} />
                          <span className={low ? 'text-danger font-medium' : 'text-ink'}>
                            {p.stockOnHand} {p.baseUnit}
                          </span>
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
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
          </>
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
