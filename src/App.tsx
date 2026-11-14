import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import { NotificationProvider } from "./components/shared/NotificationProvider";
import { ConfirmDialogProvider } from "./components/ui";
import AIScannerPage from "./features/ai-scanner/AIScannerPage";
import LoginPage from "./features/auth/LoginPage";
import CreditAccountsPage from "./features/credit-accounts/CreditAccountsPage";
import CustomersPage from "./features/customers/CustomersPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import ExpensesPage from "./features/expenses/ExpensesPage";
import PaymentsPage from "./features/payments/PaymentsPage";
import ProductsPage from "./features/products/ProductsPage";
import NewPurchasePage from "./features/purchases/NewPurchasePage";
import PurchasesPage from "./features/purchases/PurchasesPage";
import NewQuotationPage from "./features/quotations/NewQuotationPage";
import QuotationsPage from "./features/quotations/QuotationsPage";
import ReportsPage from "./features/reports/ReportsPage";
import NewSalePage from "./features/sales/NewSalePage";
import SalesPage from "./features/sales/SalesPage";
import SettingsPage from "./features/settings/SettingsPage";
import StockPage from "./features/stock/StockPage";
import SuppliersPage from "./features/suppliers/SuppliersPage";
import { useAuthStore } from "./stores/authStore";
import { useGateStore } from "./stores/licenseStore";
import SetupWizard from "./features/setup/SetupWizard";
import LicenseBanner from "./features/license/LicenseBanner";

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-7 h-7 border-[3px] border-accent/25 border-t-accent rounded-full animate-spin" />
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

function ProtectedShell() {
  return (
    <div className="min-h-screen flex bg-canvas font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="px-8 pt-4 empty:hidden"><LicenseBanner /></div>
        <Outlet />
      </main>
    </div>
  );
}

function MainAppContent() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const { license, setup, loading: gateLoading, load, subscribe } = useGateStore();

  useEffect(() => {
    checkAuth();
    void load();
    return subscribe();
  }, [checkAuth, load, subscribe]);

  if (gateLoading) return <Spinner />;
  // First run (or an upgraded install that still needs activation): wizard before anything else.
  // A restricted licence does NOT land here — it keeps the app readable (banner + Settings).
  if (!setup?.setupCompleted || license?.state === "unactivated") return <SetupWizard />;

  return (
    <HashRouter>
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
    </HashRouter>
  );
}

export default function App() {
  if (typeof window.api === "undefined") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shell text-white p-6 text-center select-none font-sans">
        <div className="max-w-md bg-surface text-ink p-8 rounded-lg shadow-lg border border-border">
          <div className="w-14 h-14 bg-danger-soft text-danger rounded-lg flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold mb-2">
            Desktop Environment Required
          </h2>

          <p className="text-sm text-ink-muted mb-6">
            Fazal Hardware is designed to run locally as an offline desktop
            application.
          </p>

          <div className="bg-canvas border border-border rounded-md p-4 text-left text-xs font-mono text-ink-muted mb-6 space-y-2">
            <p className="font-semibold text-ink">
              To launch the desktop application, run:
            </p>

            <p className="bg-surface-sunken p-1.5 rounded select-all font-bold text-ink">
              npm run dev
            </p>

            <p className="text-[10px] text-ink-faint font-sans mt-2">
              This compiles files, starts the database, and launches Electron
              automatically.
            </p>
          </div>

          <div className="text-[10px] text-ink-faint">
            Fazal Hardware • Offline-First Inventory &amp; Billing
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ConfirmDialogProvider>
          <MainAppContent />
        </ConfirmDialogProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
