import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, PackageOpen } from 'lucide-react';
import { PurchaseOrder } from '../../../shared/types';
import PurchaseDetailDialog from './PurchaseDetailDialog';
import { Badge, Button, EmptyState, PageHeader, Toolbar, Tooltip } from '../../components/ui';
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
      <PageHeader
        title="Purchases"
        count={pos?.length ?? 0}
        subtitle={`${filtered.length} result${filtered.length === 1 ? '' : 's'} — total spend ${formatPKR(totalSpend)}`}
      />

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by PO number or supplier…"
          action={
            <Link to="/purchases/new">
              <Button variant="primary">
                <Plus className="w-4 h-4" />
                New Purchase
              </Button>
            </Link>
          }
        />
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
