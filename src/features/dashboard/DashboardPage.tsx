import { ShoppingBag, ArrowUpRight, ArrowDownRight, PackageMinus, TrendingUp, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  // Skeleton KPI data
  const metrics = [
    { label: "Today's Sales", value: "Rs 0.00", count: "0 invoices", icon: ShoppingBag, color: "text-[#1F6B3B] bg-[#E8F1EA]" },
    { label: "Today's Collection", value: "Rs 0.00", count: "0 payments", icon: ArrowUpRight, color: "text-[#2563EB] bg-[#EFF6FF]" },
    { label: "Total Receivables", value: "Rs 25,000.00", count: "3 customers", icon: ArrowDownRight, color: "text-[#D97706] bg-[#FFFBEB]" },
    { label: "Total Payables", value: "Rs 165,000.00", count: "3 suppliers", icon: ArrowDownRight, color: "text-[#DC2626] bg-[#FEF2F2]" },
    { label: "Low Stock Alert", value: "0 Items", count: "Reorder level triggered", icon: PackageMinus, color: "text-amber-800 bg-amber-50" },
    { label: "Gross Margin", value: "0.00%", count: "Gross Profit margin", icon: TrendingUp, color: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#1F6B3B] to-[#14472A] rounded-xl p-6 text-white shadow-lg shadow-emerald-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold">Welcome to Fazal POS & Inventory</h1>
          <p className="text-sm text-emerald-100/80 mt-1">Store offline database is synced and verified. System is ready.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg text-sm backdrop-blur-sm border border-white/10">
          <ShieldCheck className="w-5 h-5 text-emerald-300" />
          <span>Secured Offline Environment</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-sm flex items-start justify-between hover:shadow-md transition-shadow duration-200">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block">{m.label}</span>
                <span className="text-2xl font-bold text-[#111827] block tabular-nums">{m.value}</span>
                <span className="text-xs text-[#6B7280]">{m.count}</span>
              </div>
              <div className={`p-3 rounded-lg ${m.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Lists / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#111827]">Recent Invoices</h3>
          <div className="border border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-xs text-[#6B7280]">
            No sales recorded today
          </div>
        </div>

        {/* Low Stock Items Card */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[#111827]">Low Stock Alerts</h3>
          <div className="border border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center text-xs text-[#6B7280]">
            All items are above reorder level
          </div>
        </div>
      </div>
    </div>
  );
}
