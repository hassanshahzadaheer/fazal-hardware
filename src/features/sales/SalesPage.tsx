import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, RotateCcw } from 'lucide-react';
import { SaleInvoice } from '../../../shared/types';
import SaleDetailDialog from './SaleDetailDialog';
import SaleReturnDialog from './SaleReturnDialog';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  credit: 'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
  returned: 'bg-rose-100 text-rose-700 border-rose-200',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Paid',
  credit: 'Credit',
  partial: 'Partial',
  returned: 'Returned',
};

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<SaleInvoice | null>(null);
  const [returning, setReturning] = useState<SaleInvoice | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await window.api.sales.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as SaleInvoice[];
    },
  });

  const filtered = useMemo(() => {
    if (!invoices) return [];
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.invoiceNumber, inv.customerName].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [invoices, search]);

  const totalRevenue = useMemo(() => filtered.reduce((sum, inv) => sum + inv.total, 0), [filtered]);

  const handleReturned = () => {
    setReturning(null);
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#111827]">Sales</h1>
          <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-semibold">
            {invoices?.length ?? 0}
          </span>
        </div>
        <Link
          to="/sales/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
        >
          <Plus className="w-4 h-4" />
          New Sale
        </Link>
      </div>
      <p className="text-sm text-[#6B7280] mb-4">
        {filtered.length} result{filtered.length === 1 ? '' : 's'} — total {formatPKR(totalRevenue)}
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by invoice number or customer…"
        className="w-full max-w-md mb-4 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Invoice #</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Paid</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2.5 text-[#111827] font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{inv.customerName ?? 'Walk-in'}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{new Date(inv.createdDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-[#111827]">{formatPKR(inv.total)}</td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{formatPKR(inv.paidAmount)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setViewing(inv)} className="text-[#6B7280] hover:text-[#111827]" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {inv.status !== 'returned' && (
                        <button
                          onClick={() => setReturning(inv)}
                          className="text-[#6B7280] hover:text-rose-600"
                          title="Return"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">
                    {search ? 'No sales match your search.' : 'No sales yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <SaleDetailDialog invoice={viewing} onClose={() => setViewing(null)} />}
      {returning && (
        <SaleReturnDialog invoice={returning} onClose={() => setReturning(null)} onReturned={handleReturned} />
      )}
    </div>
  );
}
