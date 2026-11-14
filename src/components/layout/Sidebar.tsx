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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Tooltip } from '../ui';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// §5.2 nav groups.
export const NAV_GROUPS: NavGroup[] = [
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
      { label: 'Company', to: '/suppliers', icon: Truck },
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
      className={`shrink-0 h-screen sticky top-0 flex flex-col bg-surface border-r border-border transition-[width] duration-200 ease-standard ${
        collapsed ? 'w-[76px]' : 'w-[256px]'
      }`}
    >
      <div className="h-[72px] flex items-center px-5 gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white font-bold text-[15px] shrink-0">
          F
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="font-semibold text-[15px] tracking-tight text-ink truncate">Fazal POS</div>
            <div className="text-[11.5px] text-ink-faint truncate">Hardware &amp; Inventory</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto pb-3 px-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[11px] font-medium text-ink-faint">{group.label}</div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                const link = (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 h-10 rounded-full text-[13.5px] transition-colors duration-150 ${
                      collapsed ? 'justify-center px-0' : 'px-3.5'
                    } ${
                      active
                        ? 'bg-accent text-white font-medium shadow-sm'
                        : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
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

      <div className="border-t border-border p-3 shrink-0">
        <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="top" className="flex w-full">
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-full text-[13px] text-ink-faint hover:bg-surface-sunken hover:text-ink transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Collapse</>}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
