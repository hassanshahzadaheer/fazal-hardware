import { useCallback, useState, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

// §24-style singleton: confirmDialog() can be called from anywhere (event
// handlers, mutation callbacks) without each caller rendering its own modal
// state — mirrors NotificationProvider's notify().
type Opener = (opts: ConfirmOptions) => Promise<boolean>;
let opener: Opener | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!opener) return Promise.resolve(false);
  return opener(opts);
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const open = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  opener = open;

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <>
      {children}
      <Modal
        open={!!pending}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={pending?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          {pending?.tone === 'danger' && (
            <div className="shrink-0 w-9 h-9 rounded-full bg-danger-soft text-danger flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          <p className="text-sm text-ink-muted">{pending?.description}</p>
        </div>
      </Modal>
    </>
  );
}
