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

function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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
    return <p className="p-8 text-sm text-[#6B7280]">Loading…</p>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {greeting()}
            {user?.fullName ? `, ${user.fullName}` : ''}
          </h1>
          <p className="text-sm text-[#6B7280]">Here's how the shop is doing today.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/purchases/new"
            className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-[#111827] text-sm font-semibold hover:bg-gray-50"
          >
            New Purchase
          </Link>
          <Link
            to="/sales/new"
            className="px-4 py-2 rounded-lg bg-[#1F6B3B] text-white text-sm font-semibold hover:bg-[#17522D]"
          >
            New Sale
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} color="text-blue-600 bg-blue-100" label="Today's Revenue" value={formatPKR(data.todayRevenue)} />
        <KpiCard icon={Boxes} color="text-purple-600 bg-purple-100" label="Stock Value" value={formatPKR(data.stockValue)} />
        <KpiCard icon={CreditCard} color="text-amber-600 bg-amber-100" label="Receivables" value={formatPKR(data.totalReceivable)} />
        <KpiCard
          icon={AlertTriangle}
          color={data.lowStockCount > 0 ? 'text-rose-600 bg-rose-100' : 'text-emerald-600 bg-emerald-100'}
          label="Low Stock Alerts"
          value={String(data.lowStockCount)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
            <h2 className="font-semibold text-[#111827]">Recent Sales</h2>
            <Link to="/sales" className="text-xs text-[#1F6B3B] font-medium hover:underline">
              View all
            </Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[#E5E7EB]">
              {data.recentSales.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-2.5 text-[#111827] font-medium">{inv.invoiceNumber}</td>
                  <td className="px-5 py-2.5 text-[#6B7280]">{inv.customerName ?? 'Walk-in'}</td>
                  <td className="px-5 py-2.5 text-[#6B7280]">{new Date(inv.createdDate).toLocaleDateString()}</td>
                  <td className="px-5 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right text-[#111827] font-medium">{formatPKR(inv.total)}</td>
                </tr>
              ))}
              {data.recentSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#6B7280]">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
              <h2 className="font-semibold text-[#111827]">Low Stock</h2>
              <Link to="/stock" className="text-xs text-[#1F6B3B] font-medium hover:underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-[#E5E7EB]">
              {data.lowStockProducts.map((p) => {
                const ratio = p.reorderLevel ? Math.min(1, p.stockOnHand / (p.reorderLevel * 2 || 1)) : 0;
                return (
                  <li key={p.id} className="px-5 py-2.5">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#111827]">{p.name}</span>
                      <span className="text-rose-600 font-medium">{p.stockOnHand}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.round(ratio * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
              {data.lowStockProducts.length === 0 && (
                <li className="px-5 py-6 text-center text-sm text-[#6B7280]">All stocked up.</li>
              )}
            </ul>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
            <h2 className="font-semibold text-[#111827] mb-1">Balance Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">Receivables</span>
              <span className="font-medium text-[#111827]">{formatPKR(data.totalReceivable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rose-700">Payables</span>
              <span className="font-medium text-[#111827]">{formatPKR(data.totalPayable)}</span>
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

function KpiCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-[#6B7280]">{label}</div>
        <div className="text-lg font-bold text-[#111827]">{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof ShoppingCart; label: string }) {
  return (
    <Link
      to={to}
      className="bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col items-center gap-2 text-center hover:border-[#1F6B3B] hover:shadow-sm transition-all"
    >
      <Icon className="w-6 h-6 text-[#1F6B3B]" />
      <span className="text-sm font-medium text-[#111827]">{label}</span>
    </Link>
  );
}
