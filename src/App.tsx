import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { useIdleTimer } from './hooks/useIdleTimer';
import Layout from './app/layout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import ProductsPage from './features/products/ProductsPage';
import { Role } from '../shared/constants';

const queryClient = new QueryClient();

// Route guard for protected routes
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="w-8 h-8 border-4 border-[#1F6B3B]/30 border-t-[#1F6B3B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Route guard for guest routes (login)
function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="w-8 h-8 border-4 border-[#1F6B3B]/30 border-t-[#1F6B3B] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Route guard for role permissions
function RequireRole({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: Role[] }) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function MainAppContent() {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const [idleMinutes, setIdleMinutes] = useState(30);

  useEffect(() => {
    checkAuth();
    
    // Fetch custom idle timeout from settings
    window.api.settings.get().then((res: any) => {
      if (res.ok && res.data?.idle_logout_minutes) {
        setIdleMinutes(res.data.idle_logout_minutes);
      }
    });
  }, [checkAuth]);

  // Activate activity lock/logout timer
  useIdleTimer(idleMinutes);

  return (
    <BrowserRouter>
      <Routes>
        {/* Guest routes */}
        <Route
          path="/login"
          element = {
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element = {
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          
          <Route 
            path="sales" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Sale POS Screen (Coming in M4)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="quotations" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Quotations Screen (Coming in M5)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="purchases" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'storekeeper']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Purchases Screen (Coming in M6)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="products" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier', 'storekeeper', 'accountant']}>
                <ProductsPage />
              </RequireRole>
            } 
          />
          <Route 
            path="parties" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier', 'storekeeper', 'accountant']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Parties Ledger Screen (Coming in M2)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="payments" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier', 'accountant']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Payments Screen (Coming in M7)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="expenses" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'accountant']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Expenses Screen (Coming in M7)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="reports" 
            element={
              <RequireRole allowedRoles={['admin', 'manager', 'cashier', 'storekeeper', 'accountant']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Reports Screen (Coming in M8)</div>
              </RequireRole>
            } 
          />
          <Route 
            path="settings" 
            element={
              <RequireRole allowedRoles={['admin', 'manager']}>
                <div className="bg-white p-6 rounded-xl border border-gray-200">Settings Screen (Coming in M9)</div>
              </RequireRole>
            } 
          />
        </Route>

        {/* Fallback */}
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
            Fazal POS & Inventory is designed to run locally as an offline desktop application.
          </p>
          <div className="bg-[#F7F8FA] border border-[#E5E7EB] rounded-lg p-4 text-left text-xs font-mono text-gray-700 mb-6 space-y-2">
            <p className="font-semibold text-gray-900">To launch the desktop application, run:</p>
            <p className="bg-[#E5E7EB] p-1.5 rounded select-all font-bold">npm run dev</p>
            <p className="text-[10px] text-gray-500 font-sans mt-2">
              This compiles files, starts the database, and launches Electron automatically.
            </p>
          </div>
          <div className="text-[10px] text-gray-400">
            Fazal POS & Inventory • Offline-First Retail ERP
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MainAppContent />
    </QueryClientProvider>
  );
}
