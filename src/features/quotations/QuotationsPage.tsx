import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, FileText } from 'lucide-react';
import { Quotation } from '../../../shared/types';
import ViewQuotationDialog from './ViewQuotationDialog';
import { Input, Badge, EmptyState, Tooltip } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'success' | 'danger'> = {
  draft: 'neutral',
  sent: 'accent',
  converted: 'success',
  cancelled: 'danger',
};

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<Quotation | null>(null);

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const res = await window.api.quotations.list();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as Quotation[];
    },
  });

  const filtered = useMemo(() => {
    if (!quotations) return [];
    const q = search.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((qt) =>
      [qt.quotationNumber, qt.customerName, qt.remarks].filter(Boolean).some((f) => f!.toLowerCase().includes(q))
    );
  }, [quotations, search]);

  const totalValue = useMemo(() => filtered.reduce((sum, qt) => sum + qt.total, 0), [filtered]);

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink tracking-tight">Quotations</h1>
            <Badge tone="accent">{quotations?.length ?? 0}</Badge>
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {filtered.length} quote{filtered.length === 1 ? '' : 's'} — total value {formatPKR(totalValue)}
          </p>
        </div>
        <Link
          to="/quotations/new"
          className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-standard bg-accent text-white hover:bg-accent-hover active:bg-accent-active shadow-xs px-4 py-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </Link>
      </div>

      <div className="relative w-full max-w-sm mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by quote #, customer, or remarks…"
        />
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'No quotations match your search' : 'No quotations yet'}
            description={search ? 'Try a different quote number, customer, or remark.' : 'Quotations you create will show up here.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Quote #</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Total</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((qt) => (
                  <tr key={qt.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink">{qt.quotationNumber}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{qt.customerName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{new Date(qt.createdDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[qt.status]}>
                        <span className="capitalize">{qt.status}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-ink tabular-nums">{formatPKR(qt.total)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end">
                        <Tooltip content="View quotation details">
                          <button
                            onClick={() => setViewing(qt)}
                            aria-label={`View ${qt.quotationNumber}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && <ViewQuotationDialog quotation={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
