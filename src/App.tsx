import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function Placeholder() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    window.api.app.getVersion().then((res: any) => {
      if (res.ok) setVersion(res.data);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] font-sans">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#111827]">Fazal Hardware</h1>
        <p className="text-sm text-[#6B7280] mt-2">
          Boilerplate ready{version ? ` — v${version}` : ''}. Build modules per docs/Fazal_Hardware_PRD.md.
        </p>
      </div>
    </div>
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
      <Placeholder />
    </QueryClientProvider>
  );
}
