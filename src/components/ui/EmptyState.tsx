import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div role="status" className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-11 h-11 rounded-full bg-surface-sunken text-ink-faint flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-[13px] text-ink-muted mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
