import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  PackageSearch,
  ScanLine,
  ShoppingCart,
  FileText,
  PackageOpen,
  TrendingDown,
  CreditCard,
  Users,
  Truck,
  HandCoins,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// §5.2 nav groups.
const NAV_GROUPS: NavGroup[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard }] },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Boxes },
      { label: 'Stock', to: '/stock', icon: PackageSearch },
      { label: 'AI Scanner', to: '/ai-scanner', icon: ScanLine },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { label: 'Sales', to: '/sales', icon: ShoppingCart },
      { label: 'Quotations', to: '/quotations', icon: FileText },
      { label: 'Purchases', to: '/purchases', icon: PackageOpen },
      { label: 'Expenses', to: '/expenses', icon: TrendingDown },
      { label: 'Payments', to: '/payments', icon: CreditCard },
    ],
  },
  {
    label: 'Parties',
    items: [
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Suppliers', to: '/suppliers', icon: Truck },
      { label: 'Credit Accounts', to: '/credit-accounts', icon: HandCoins },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', to: '/reports', icon: BarChart3 },
      { label: 'Settings', to: '/settings', icon: SettingsIcon },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 flex flex-col text-white transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
      style={{ background: 'linear-gradient(180deg, #0F2F1D 0%, #14472A 55%, #1F6B3B 100%)' }}
    >
      <div className="h-14 flex items-center px-4 gap-2 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold text-lg shrink-0">
          F
        </div>
        {!collapsed && <span className="font-bold text-sm truncate">Fazal Hardware</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      active ? 'bg-white/15 font-semibold text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2 space-y-1 shrink-0">
        {!collapsed && user && (
          <div className="px-2.5 py-1.5 text-xs text-white/60 truncate">{user.email}</div>
        )}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
