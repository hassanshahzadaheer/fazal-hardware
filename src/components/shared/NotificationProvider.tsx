import { useCallback, useEffect, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// §24: global notify() — imported and called directly from anywhere
// (not a hook), since most calls happen inside event handlers / mutation
// callbacks rather than component render bodies.
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (message: string, type: ToastType) => void;
let listener: Listener | null = null;

export function notify(message: string, type: ToastType = 'info') {
  listener?.(message, type);
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const BAR_COLOR: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-rose-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

const ICON_COLOR: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-rose-600',
  warning: 'text-amber-600',
  info: 'text-blue-600',
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listener = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 5000);
    };
    return () => {
      listener = null;
    };
  }, [remove]);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              className={`pointer-events-auto bg-white shadow-lg rounded-lg border border-[#E5E7EB] border-l-4 ${BAR_COLOR[t.type]} px-4 py-3 flex items-start gap-2.5 cursor-pointer animate-toast-in`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ICON_COLOR[t.type]}`} />
              <span className="text-sm text-[#111827] flex-1">{t.message}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(t.id);
                }}
                className="text-[#6B7280] hover:text-[#111827]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
