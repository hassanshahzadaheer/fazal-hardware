import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Boxes,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  PackageOpen,
  ScanLine,
  BarChart3,
} from 'lucide-react';
import { DashboardData } from '../../../shared/types';
import { useAuthStore } from '../../stores/authStore';
import { Button, Badge, Skeleton } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await window.api.dashboard.get();
      if (!res.ok) throw new Error(res.error.message);
      return res.data as DashboardData;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink tracking-tight">
            {greeting()}
            {user?.fullName ? `, ${user.fullName}` : ''}
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Here's how the shop is doing today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/purchases/new">
            <Button variant="secondary">New Purchase</Button>
          </Link>
          <Link to="/sales/new">
            <Button variant="primary">New Sale</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} tone="accent" label="Today's Revenue" value={formatPKR(data.todayRevenue)} />
        <KpiCard icon={Boxes} tone="accent" label="Stock Value" value={formatPKR(data.stockValue)} />
        <KpiCard icon={CreditCard} tone="warning" label="Receivables" value={formatPKR(data.totalReceivable)} />
        <KpiCard
          icon={AlertTriangle}
          tone={data.lowStockCount > 0 ? 'danger' : 'success'}
          label="Low Stock Alerts"
          value={String(data.lowStockCount)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="font-semibold text-ink">Recent Sales</h2>
            <Link to="/sales" className="text-xs text-accent font-medium hover:underline">
              View all
            </Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {data.recentSales.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-sunken/60 transition-colors">
                  <td className="px-5 py-2.5 text-ink font-medium">{inv.invoiceNumber}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{inv.customerName ?? 'Walk-in'}</td>
                  <td className="px-5 py-2.5 text-ink-muted">{new Date(inv.createdDate).toLocaleDateString()}</td>
                  <td className="px-5 py-2.5">
                    <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink font-medium tabular-nums">{formatPKR(inv.total)}</td>
                </tr>
              ))}
              {data.recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-muted">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-ink">Low Stock</h2>
              <Link to="/stock" className="text-xs text-accent font-medium hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {data.lowStockProducts.map((p) => {
                const ratio = p.reorderLevel ? Math.min(1, p.stockOnHand / (p.reorderLevel * 2 || 1)) : 0;
                return (
                  <li key={p.id} className="px-5 py-2.5">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink">{p.name}</span>
                      <span className="text-danger font-medium">{p.stockOnHand}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                      <div className="h-full bg-danger rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
              {data.lowStockProducts.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-ink-muted">All stocked up.</li>
              )}
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-md p-5 space-y-3">
            <h2 className="font-semibold text-ink mb-1">Balance Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-warning">Receivables</span>
              <span className="font-medium text-ink tabular-nums">{formatPKR(data.totalReceivable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-danger">Payables</span>
              <span className="font-medium text-ink tabular-nums">{formatPKR(data.totalPayable)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickAction to="/sales/new" icon={ShoppingCart} label="New Sale" />
        <QuickAction to="/purchases/new" icon={PackageOpen} label="New Purchase" />
        <QuickAction to="/ai-scanner" icon={ScanLine} label="Scan Invoice" />
        <QuickAction to="/reports" icon={BarChart3} label="View Reports" />
      </div>
    </div>
  );
}

const TONE_CLS: Record<'accent' | 'warning' | 'danger' | 'success', string> = {
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
};

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  tone: 'accent' | 'warning' | 'danger' | 'success';
  label: string;
  value: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md flex items-center justify-center ${TONE_CLS[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="text-lg font-bold text-ink tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof ShoppingCart; label: string }) {
  return (
    <Link
      to={to}
      className="bg-surface border border-border rounded-md p-5 flex flex-col items-center gap-2 text-center hover:border-accent hover:shadow-xs transition-all"
    >
      <Icon className="w-6 h-6 text-accent" />
      <span className="text-sm font-medium text-ink">{label}</span>
    </Link>
  );
}
