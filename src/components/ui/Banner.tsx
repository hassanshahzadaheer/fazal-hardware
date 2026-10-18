import { ReactNode, useState } from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLS: Record<Tone, string> = {
  info: 'bg-accent-soft border-accent-soft-border text-accent',
  success: 'bg-success-soft border-success/20 text-success',
  warning: 'bg-warning-soft border-warning/20 text-warning',
  danger: 'bg-danger-soft border-danger/20 text-danger',
};

const ICONS: Record<Tone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

interface Props {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  action?: ReactNode;
}

export default function Banner({ tone = 'info', title, children, dismissible, action }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  const Icon = ICONS[tone];

  return (
    <div className={`flex items-start gap-3 rounded-md border px-4 py-3 text-[13px] ${TONE_CLS[tone]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-ink-muted [&>p]:text-ink-muted leading-5">{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-ink-faint hover:text-ink transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
