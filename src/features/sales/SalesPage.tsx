import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, RotateCcw, Receipt } from 'lucide-react';
import { SaleInvoice } from '../../../shared/types';
import SaleDetailDialog from './SaleDetailDialog';
import SaleReturnDialog from './SaleReturnDialog';
import { Badge, EmptyState, Tooltip, PageHeader, Toolbar } from '../../components/ui';
import { TableSkeleton } from '../../components/ui/Skeleton';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'accent' | 'danger'> = {
  completed: 'success',
  credit: 'warning',
  partial: 'accent',
  returned: 'danger',
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
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Sales"
        count={invoices?.length ?? 0}
        subtitle={`${filtered.length} result${filtered.length === 1 ? '' : 's'} — total ${formatPKR(totalRevenue)}`}
      />

      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by invoice number or customer…"
          action={
            <Link
              to="/sales/new"
              className="inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 ease-standard bg-accent text-white hover:bg-accent-hover active:bg-accent-active shadow-xs px-4 py-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Sale
            </Link>
          }
        />
        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={search ? 'No sales match your search' : 'No sales yet'}
            description={search ? 'Try a different invoice number or customer.' : 'Completed sales will show up here.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-left text-ink-muted border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Total</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Paid</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 font-medium text-[12px] uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-sunken/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{inv.customerName ?? 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{new Date(inv.createdDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-ink tabular-nums">{formatPKR(inv.total)}</td>
                    <td className="px-4 py-2.5 text-ink-muted tabular-nums">{formatPKR(inv.paidAmount)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="View invoice details">
                          <button
                            onClick={() => setViewing(inv)}
                            aria-label={`View ${inv.invoiceNumber}`}
                            className="text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1.5 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        {inv.status !== 'returned' && (
                          <Tooltip content="Return items from this sale">
                            <button
                              onClick={() => setReturning(inv)}
                              aria-label={`Return ${inv.invoiceNumber}`}
                              className="text-ink-faint hover:text-danger hover:bg-danger-soft rounded-md p-1.5 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && <SaleDetailDialog invoice={viewing} onClose={() => setViewing(null)} />}
      {returning && (
        <SaleReturnDialog invoice={returning} onClose={() => setReturning(null)} onReturned={handleReturned} />
      )}
    </div>
  );
}
