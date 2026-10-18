import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Boxes,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  PackageOpen,
  ScanLine,
  BarChart3,
  Trophy,
} from 'lucide-react';
import { DashboardData, SalesByDay, TopProduct } from '../../../shared/types';
import { useAuthStore } from '../../stores/authStore';
import { Button, Badge, Skeleton, Banner } from '../../components/ui';

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
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

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  const { data: trend } = useQuery({
    queryKey: ['reports', 'salesByDay', 8],
    queryFn: async () => {
      const res = await window.api.reports.salesByDay(8);
      return res.ok ? (res.data as SalesByDay[]) : [];
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ['reports', 'topProducts'],
    queryFn: async () => {
      const res = await window.api.reports.topProducts();
      return res.ok ? (res.data as TopProduct[]).slice(0, 5) : [];
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

  const last7 = (trend ?? []).slice(-7);
  const todayIdx = last7.length - 1;
  const yesterdayRevenue = todayIdx > 0 ? last7[todayIdx - 1].revenue : null;
  const revenueDelta =
    yesterdayRevenue !== null && yesterdayRevenue > 0
      ? Math.round(((data.todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null;
  const chartData = last7.map((d) => ({
    ...d,
    label: WEEKDAY[new Date(d.date).getDay()],
  }));
  const maxTopRevenue = Math.max(1, ...(topProducts ?? []).map((p) => p.revenue));

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
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

      {data.lowStockCount > 0 && (
        <Banner
          tone="warning"
          title={`${data.lowStockCount} product${data.lowStockCount === 1 ? '' : 's'} running low on stock`}
          action={
            <Link to="/stock" className="text-[13px] font-medium text-warning hover:underline">
              Review stock levels →
            </Link>
          }
        >
          Reorder soon to avoid turning away customers for these items.
        </Banner>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} tone="accent" label="Today's Revenue" value={formatPKR(data.todayRevenue)} delta={revenueDelta} />
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
            <div>
              <h2 className="font-semibold text-ink">Revenue, last 7 days</h2>
              <p className="text-xs text-ink-muted mt-0.5">Daily sales revenue across the shop</p>
            </div>
          </div>
          <div className="px-3 pt-4 pb-1 h-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9AA0AC', fontSize: 12 }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(47,95,238,0.06)' }}
                    formatter={(value) => [formatPKR(Number(value)), 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E6E8EC', fontSize: 12 }}
                  />
                  {/* Fill uses the accent brand hex directly — recharts needs a raw
                      color value for SVG fill, not a Tailwind class. */}
                  <Bar dataKey="revenue" fill="#2F5FEE" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-ink-muted">
                Not enough sales data yet to chart a trend.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-b border-border">
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
              <h2 className="font-semibold text-ink flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-warning" />
                Top Products
              </h2>
              <Link to="/reports" className="text-xs text-accent font-medium hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {(topProducts ?? []).map((p, i) => (
                <li key={p.productId} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="w-5 text-xs font-semibold text-ink-faint shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{p.productName}</div>
                    <div className="w-full h-1 bg-surface-sunken rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.max(6, Math.round((p.revenue / maxTopRevenue) * 100))}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-ink tabular-nums shrink-0">{formatPKR(p.revenue)}</span>
                </li>
              ))}
              {(topProducts ?? []).length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-ink-muted">No sales data yet.</li>
              )}
            </ul>
          </div>

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
        <QuickAction to="/sales/new" icon={ShoppingCart} label="New Sale" tone="accent" />
        <QuickAction to="/purchases/new" icon={PackageOpen} label="New Purchase" tone="success" />
        <QuickAction to="/ai-scanner" icon={ScanLine} label="Scan Invoice" tone="warning" />
        <QuickAction to="/reports" icon={BarChart3} label="View Reports" tone="danger" />
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
  delta,
}: {
  icon: typeof TrendingUp;
  tone: 'accent' | 'warning' | 'danger' | 'success';
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="bg-surface border border-border rounded-md p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${TONE_CLS[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <div className="text-lg font-bold text-ink tabular-nums truncate">{value}</div>
          {delta !== null && delta !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold shrink-0 ${
                delta >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  tone,
}: {
  to: string;
  icon: typeof ShoppingCart;
  label: string;
  tone: 'accent' | 'warning' | 'danger' | 'success';
}) {
  return (
    <Link
      to={to}
      className="bg-surface border border-border rounded-md p-5 flex flex-col items-center gap-2.5 text-center hover:border-accent hover:shadow-xs transition-all"
    >
      <div className={`w-10 h-10 rounded-md flex items-center justify-center ${TONE_CLS[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-medium text-ink">{label}</span>
    </Link>
  );
}
