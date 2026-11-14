import { ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_CLS: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted border border-border',
  accent: 'bg-accent-soft text-accent border border-accent-soft-border',
  success: 'bg-success-soft text-success border border-success/20',
  warning: 'bg-warning-soft text-warning border border-warning/20',
  danger: 'bg-danger-soft text-danger border border-danger/20',
};

export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium ${TONE_CLS[tone]}`}>
      {children}
    </span>
  );
}
