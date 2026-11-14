import { ReactNode } from 'react';
import Badge from './Badge';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  children?: ReactNode; // right-aligned slot — rarely needed now that
  // primary actions live in <Toolbar>, but kept for pages with no table
  // (e.g. a standalone form page) that still need a top-right action.
}

export default function PageHeader({ title, subtitle, count, children }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          {count !== undefined && <Badge tone="accent">{count}</Badge>}
        </div>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
