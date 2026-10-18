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

const DURATION_MS = 4500;

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLOR: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
};

const BAR_COLOR: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-accent',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  return (
    <div
      onClick={onDismiss}
      className="pointer-events-auto relative overflow-hidden bg-surface shadow-lg rounded-md border border-border px-4 py-3 pr-9 flex items-start gap-2.5 cursor-pointer animate-toast-in"
    >
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ICON_COLOR[toast.type]}`} />
      <span className="text-[13px] leading-5 text-ink flex-1">{toast.message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
        className="absolute top-2.5 right-2.5 text-ink-faint hover:text-ink"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border">
        <div
          className={`h-full ${BAR_COLOR[toast.type]}`}
          style={{ animation: `toast-shrink ${DURATION_MS}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listener = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), DURATION_MS);
    };
    return () => {
      listener = null;
    };
  }, [remove]);

  return (
    <>
      {children}
      <style>{'@keyframes toast-shrink { from { width: 100%; } to { width: 0%; } }'}</style>
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[360px] pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </>
  );
}
