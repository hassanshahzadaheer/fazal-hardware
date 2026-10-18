import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

const SIZE_CLS: Record<NonNullable<Props['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, description, size = 'md', children, footer }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-surface rounded-lg shadow-lg w-full ${SIZE_CLS[size]} max-h-[90vh] overflow-y-auto animate-scale-in`}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border sticky top-0 bg-surface">
          <div>
            <h2 id="modal-title" className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="text-[13px] text-ink-muted mt-0.5">{description}</p>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 text-ink-faint hover:text-ink hover:bg-surface-sunken rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-surface-sunken/60">{footer}</div>}
      </div>
    </div>
  );
}
