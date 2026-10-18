import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { PurchaseOrder } from '../../../shared/types';
import PurchaseDetailDialog from './PurchaseDetailDialog';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  credit: 'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
  returned: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function PurchasesPage() {
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);

  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await window.api.purchases.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as PurchaseOrder[];
    },
  });

  const filtered = useMemo(() => {
    if (!pos) return [];
    const q = search.trim().toLowerCase();
    if (!q) return pos;
    return pos.filter((po) => [po.poNumber, po.supplierName].filter(Boolean).some((f) => f!.toLowerCase().includes(q)));
  }, [pos, search]);

  const totalSpend = useMemo(() => filtered.reduce((sum, po) => sum + po.total, 0), [filtered]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#111827]">Purchases</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-semibold">
            {pos?.length ?? 0}
          </span>
        </div>
        <Link
          to="/purchases/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </Link>
      </div>
      <p className="text-sm text-[#6B7280] mb-4">
        {filtered.length} result{filtered.length === 1 ? '' : 's'} — total spend {formatPKR(totalSpend)}
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by PO number or supplier…"
        className="w-full max-w-md mb-4 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">PO #</th>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((po) => (
                <tr key={po.id}>
                  <td className="px-4 py-2.5 text-[#111827] font-medium">{po.poNumber}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{po.supplierName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{new Date(po.createdDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-[#111827]">{formatPKR(po.total)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${STATUS_BADGE[po.status]}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end">
                      <button onClick={() => setViewing(po)} className="text-[#6B7280] hover:text-[#111827]" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    {search ? 'No purchases match your search.' : 'No purchases yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <PurchaseDetailDialog po={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
