import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Payment } from '../../../shared/types';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const MODE_ICON: Record<string, string> = {
  cash: '💵',
  card: '💳',
  bank_transfer: '🏦',
  cheque: '📄',
  other: '🔄',
};

export default function PaymentsPage() {
  const [search, setSearch] = useState('');

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await window.api.payments.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as Payment[];
    },
  });

  const totalReceived = useMemo(
    () => (payments ?? []).filter((p) => p.direction === 'received').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const totalPaid = useMemo(
    () => (payments ?? []).filter((p) => p.direction === 'paid').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const filtered = useMemo(() => {
    if (!payments) return [];
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [p.partyName, p.mode].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [payments, search]);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-[#111827]">Payments</h1>
        <span className="px-2 py-0.5 rounded-full bg-[#E8F1EA] text-[#1F6B3B] text-xs font-semibold">
          {payments?.length ?? 0}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Total Received</div>
            <div className="text-lg font-bold text-[#111827]">{formatPKR(totalReceived)}</div>
          </div>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-[#6B7280]">Total Paid Out</div>
            <div className="text-lg font-bold text-[#111827]">{formatPKR(totalPaid)}</div>
          </div>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by party name or payment mode…"
        className="w-full max-w-md mb-4 px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6B3B]/40"
      />

      {isLoading && <p className="text-sm text-[#6B7280]">Loading…</p>}

      {!isLoading && (
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-left text-[#6B7280]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Party</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Direction</th>
                <th className="px-4 py-2.5 font-medium">Mode</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-[#111827] font-medium">{p.partyName ?? '—'}</td>
                  <td className="px-4 py-2.5 text-[#6B7280] capitalize">{p.partyType}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        p.direction === 'received' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {p.direction === 'received' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                      {p.direction === 'received' ? 'Received' : 'Paid Out'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#6B7280]">
                    {MODE_ICON[p.mode] ?? '🔄'} <span className="capitalize">{p.mode.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#6B7280]">{new Date(p.createdDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <span className={p.direction === 'received' ? 'text-emerald-700' : 'text-rose-700'}>
                      {p.direction === 'received' ? '+' : '-'}
                      {formatPKR(p.amount)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6B7280]">
                    {search ? 'No payments match your search.' : 'No payments yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
