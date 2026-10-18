import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import Sidebar from './components/layout/Sidebar';
import { NotificationProvider } from './components/shared/NotificationProvider';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import SettingsPage from './features/settings/SettingsPage';
import ProductsPage from './features/products/ProductsPage';
import CustomersPage from './features/customers/CustomersPage';
import SuppliersPage from './features/suppliers/SuppliersPage';
import StockPage from './features/stock/StockPage';
import SalesPage from './features/sales/SalesPage';
import NewSalePage from './features/sales/NewSalePage';
import PurchasesPage from './features/purchases/PurchasesPage';
import NewPurchasePage from './features/purchases/NewPurchasePage';
import PaymentsPage from './features/payments/PaymentsPage';
import CreditAccountsPage from './features/credit-accounts/CreditAccountsPage';
import QuotationsPage from './features/quotations/QuotationsPage';
import NewQuotationPage from './features/quotations/NewQuotationPage';
import ExpensesPage from './features/expenses/ExpensesPage';
import ReportsPage from './features/reports/ReportsPage';
import AIScannerPage from './features/ai-scanner/AIScannerPage';

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
      <div className="w-8 h-8 border-4 border-[#1F6B3B]/30 border-t-[#1F6B3B] rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// §5.1-§5.2: collapsible sidebar + main content area, no top bar.
function ProtectedShell() {
  return (
    <div className="min-h-screen flex bg-[#F7F8FA] font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}

function MainAppContent() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <ProtectedShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/new" element={<NewSalePage />} />
          <Route path="purchases" element={<PurchasesPage />} />
          <Route path="purchases/new" element={<NewPurchasePage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="credit-accounts" element={<CreditAccountsPage />} />
          <Route path="quotations" element={<QuotationsPage />} />
          <Route path="quotations/new" element={<NewQuotationPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="ai-scanner" element={<AIScannerPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  if (typeof window.api === 'undefined') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0F2F1D] via-[#14472A] to-[#1F6B3B] text-white p-6 text-center select-none font-sans">
        <div className="max-w-md bg-white/95 backdrop-blur-md text-[#111827] p-8 rounded-2xl shadow-2xl border border-white/20">
          <div className="w-16 h-16 bg-[#DC2626]/10 text-[#DC2626] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Desktop Environment Required</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Fazal Hardware is designed to run locally as an offline desktop application.
          </p>
          <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg p-4 text-left text-xs font-mono text-gray-700 mb-6 space-y-2">
            <p className="font-semibold text-gray-900">To launch the desktop application, run:</p>
            <p className="bg-[#E5E7EB] p-1.5 rounded select-all font-bold">npm run dev</p>
            <p className="text-[10px] text-gray-500 font-sans mt-2">
              This compiles files, starts the database, and launches Electron automatically.
            </p>
          </div>
          <div className="text-[10px] text-gray-400">
            Fazal Hardware • Offline-First Inventory & Billing
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <MainAppContent />
      </NotificationProvider>
    </QueryClientProvider>
  );
}
