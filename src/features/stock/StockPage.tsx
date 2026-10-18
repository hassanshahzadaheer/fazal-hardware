import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, SlidersHorizontal, Clock } from 'lucide-react';
import { ProductWithNames } from '../../../shared/types';
import StockAdjustDialog from './StockAdjustDialog';
import StockHistoryDialog from './StockHistoryDialog';

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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-[#111827]">Stock Management</h1>
        {lowStockCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
            {lowStockCount} low stock
          </span>
        )}
      </div>
      <p className="text-sm text-[#6B7280] mb-4">Total inventory value: {formatPKR(totalValue)}</p>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 border-b border-[#E5E7EB]">
          {(['all', 'low'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === key
                  ? 'border-[#1F6B3B] text-[#1F6B3B]'
                  : 'border-transparent text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {key === 'all' ? 'All Stock' : 'Low Stock'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category, or brand…"
          className="flex-1 max-w-sm px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
        />
      </div>

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">On Hand</th>
                <th className="px-4 py-2.5 font-medium">Reorder Level</th>
                <th className="px-4 py-2.5 font-medium">Value</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((p) => {
                const low = isLowStock(p);
                const ratio = p.reorderLevel ? Math.min(1, p.stockOnHand / (p.reorderLevel * 2 || 1)) : 1;
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-[#111827]">{p.name}</div>
                      {p.brandName && <div className="text-xs text-[#6B7280]">{p.brandName}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{p.categoryName ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className={`flex items-center gap-1.5 ${low ? 'text-rose-600 font-medium' : 'text-[#111827]'}`}>
                        {low && <AlertTriangle className="w-3.5 h-3.5" />}
                        {p.stockOnHand} {p.baseUnit}
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${low ? 'bg-rose-500' : 'bg-[#1F6B3B]'}`}
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{p.reorderLevel ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[#111827]">{formatPKR(p.stockOnHand * (p.costPrice ?? 0))}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setAdjusting(p)}
                          className="flex items-center gap-1 text-[#6B7280] hover:text-[#111827] text-xs font-medium"
                          title="Adjust"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Adjust
                        </button>
                        <button
                          onClick={() => setViewingHistory(p)}
                          className="text-[#6B7280] hover:text-[#111827]"
                          title="History"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    {tab === 'low' ? 'No products are low on stock.' : 'No products yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {adjusting && (
        <StockAdjustDialog product={adjusting} onClose={() => setAdjusting(null)} onSaved={handleAdjusted} />
      )}
      {viewingHistory && (
        <StockHistoryDialog product={viewingHistory} onClose={() => setViewingHistory(null)} />
      )}
    </div>
  );
}
