import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, PackageOpen } from 'lucide-react';
import { PurchaseOrder } from '../../../shared/types';
import PurchaseDetailDialog from './PurchaseDetailDialog';
import { Badge, Button, EmptyState, Input, Tooltip } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'accent' | 'danger'> = {
  received: 'success',
  credit: 'warning',
  partial: 'accent',
  returned: 'danger',
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
    <div className="p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-semibold text-ink tracking-tight">Purchases</h1>
            <Badge tone="accent">{pos?.length ?? 0}</Badge>
          </div>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {filtered.length} result{filtered.length === 1 ? '' : 's'} — total spend {formatPKR(totalSpend)}
          </p>
        </div>
        <Link
          to="/purchases/new"
          className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-standard bg-accent text-white hover:bg-accent-hover active:bg-accent-active shadow-xs px-4 py-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </Link>
      </div>

      <div className="relative w-full max-w-md mb-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number or supplier…"
        />
      </div>

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={search ? 'No purchases match your search' : 'No purchases yet'}
            description={search ? 'Try a different PO number or supplier.' : 'Record your first purchase to start tracking stock received.'}
            action={!search && (
              <Link to="/purchases/new">
                <Button variant="primary">
                  <Plus className="w-4 h-4" />
                  New Purchase
                </Button>
              </Link>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">PO #</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Total</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5 text-ink font-medium">{po.poNumber}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{po.supplierName ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{new Date(po.createdDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-ink tabular-nums">{formatPKR(po.total)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[po.status] ?? 'neutral'}>
                        <span className="capitalize">{po.status}</span>
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end">
                        <Tooltip content="View purchase order details">
                          <button
                            onClick={() => setViewing(po)}
                            aria-label={`View ${po.poNumber}`}
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

      {viewing && <PurchaseDetailDialog po={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
