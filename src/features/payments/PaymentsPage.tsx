import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';
import { Payment } from '../../../shared/types';
import { Badge, EmptyState, PageHeader, Toolbar, Pagination } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

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

// A small rotating palette gives each row a tiny bit of visual identity —
// deterministic per payment id, not random, so it doesn't reshuffle on
// every re-render/refetch.
const AVATAR_TONES = [
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
  'bg-surface-sunken text-ink-muted',
];

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  return (
    <div className="p-8">
      <PageHeader title="Payments" count={payments?.length ?? 0} />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-xl">
        <div className="bg-surface border border-border rounded-md p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-success-soft text-success flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-ink-muted">Total Received</div>
            <div className="text-lg font-semibold text-ink">{formatPKR(totalReceived)}</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-danger-soft text-danger flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-ink-muted">Total Paid Out</div>
            <div className="text-lg font-semibold text-ink">{formatPKR(totalPaid)}</div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by party name or payment mode…"
        />
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={search ? 'No payments match your search' : 'No payments yet'}
            description={search ? 'Try a different party name or payment mode.' : 'Payments received or paid out will show up here.'}
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Party</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Direction</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Mode</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((p) => {
                  const tone = AVATAR_TONES[p.id % AVATAR_TONES.length];
                  return (
                  <tr key={p.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 ${tone}`}
                        >
                          {(p.partyName ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-ink font-medium truncate">{p.partyName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted capitalize">{p.partyType}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={p.direction === 'received' ? 'success' : 'danger'}>
                        <span className="inline-flex items-center gap-1">
                          {p.direction === 'received' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {p.direction === 'received' ? 'Received' : 'Paid Out'}
                        </span>
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {MODE_ICON[p.mode] ?? '🔄'} <span className="capitalize">{p.mode.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{new Date(p.createdDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      <span className={p.direction === 'received' ? 'text-success' : 'text-danger'}>
                        {p.direction === 'received' ? '+' : '-'}
                        {formatPKR(p.amount)}
                      </span>
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
    </div>
  );
}
