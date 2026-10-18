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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Tooltip } from '../ui';
import UserMenu from './UserMenu';

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

  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 flex flex-col bg-shell text-white transition-[width] duration-200 ease-standard ${
        collapsed ? 'w-[68px]' : 'w-[232px]'
      }`}
    >
      <div className="h-14 flex items-center px-4 gap-2.5 border-b border-shell-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          F
        </div>
        {!collapsed && <span className="font-semibold text-[13px] tracking-tight truncate">Fazal Hardware</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                const link = (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-150 ${
                      active ? 'bg-shell-raised text-white font-medium' : 'text-white/55 hover:bg-shell-raised/60 hover:text-white/90'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2.5px] rounded-full bg-accent" />}
                    <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
                return collapsed ? (
                  <Tooltip key={item.to} content={item.label} side="bottom" className="flex w-full">
                    {link}
                  </Tooltip>
                ) : (
                  link
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-shell-border p-2 space-y-0.5 shrink-0">
        <UserMenu collapsed={collapsed} />
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="top" className="flex w-full">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center py-[7px] rounded-md text-white/35 hover:bg-shell-raised/60 hover:text-white/80 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
