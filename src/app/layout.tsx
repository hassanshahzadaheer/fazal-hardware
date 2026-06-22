import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  PackageOpen,
  Boxes,
  Users,
  CreditCard,
  TrendingDown,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  Lock,
  Clock
} from 'lucide-react';
import dayjs from 'dayjs';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(dayjs());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier', 'storekeeper', 'accountant'] },
    { label: 'Sale / POS', path: '/sales', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier'] },
    { label: 'Quotations', path: '/quotations', icon: FileText, roles: ['admin', 'manager', 'cashier'] },
    { label: 'Purchases', path: '/purchases', icon: PackageOpen, roles: ['admin', 'manager', 'storekeeper'] },
    { label: 'Products Master', path: '/products', icon: Boxes, roles: ['admin', 'manager', 'cashier', 'storekeeper', 'accountant'] },
    { label: 'Parties Ledger', path: '/parties', icon: Users, roles: ['admin', 'manager', 'cashier', 'storekeeper', 'accountant'] },
    { label: 'Payments', path: '/payments', icon: CreditCard, roles: ['admin', 'manager', 'cashier', 'accountant'] },
    { label: 'Expenses', path: '/expenses', icon: TrendingDown, roles: ['admin', 'manager', 'accountant'] },
    { label: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager', 'cashier', 'storekeeper', 'accountant'] },
    { label: 'Settings & Users', path: '/settings', icon: SettingsIcon, roles: ['admin', 'manager'] },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLock = () => {
    // Lock app by logging out or going to login/lock screen (we will trigger logout for safety)
    logout();
    navigate('/login');
  };

  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA] font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-[#E5E7EB] flex flex-col transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-14 border-b border-[#E5E7EB] flex items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#1F6B3B] flex items-center justify-center text-white font-bold text-lg">
                F
              </div>
              <span className="font-bold text-sm text-[#111827] truncate">Fazal Plywood</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-[#1F6B3B] flex items-center justify-center text-white font-bold text-lg mx-auto">
              F
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#E8F1EA] text-[#1F6B3B] font-semibold'
                    : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1F6B3B]' : ''}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="p-2 border-t border-[#E5E7EB]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full py-2 flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 rounded-lg"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-[#111827] text-base">
              {navItems.find(item => item.path === location.pathname)?.label || 'Fazal POS'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Clock */}
            <div className="hidden md:flex items-center gap-2 text-sm text-[#6B7280] font-medium bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 tabular-nums">
              <Clock className="w-4 h-4 text-[#1F6B3B]" />
              <span>{time.format('DD-MM-YYYY hh:mm:ss A')}</span>
            </div>

            {/* DB Connected Status */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <Database className="w-4 h-4 text-[#1F6B3B]" />
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="hidden sm:inline">Offline DB</span>
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="flex flex-col text-right">
                  <span className="text-sm font-semibold text-[#111827]">{user.fullName}</span>
                  <span className="text-xs text-[#6B7280] capitalize font-medium">{user.role}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#E8F1EA] flex items-center justify-center text-[#1F6B3B] font-bold">
                  {user.fullName[0].toUpperCase()}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleLock}
                className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 rounded-lg"
                title="Lock Application"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-[#F7F8FA] p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
