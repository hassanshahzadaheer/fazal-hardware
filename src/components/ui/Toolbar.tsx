import { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

interface Props {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode; // extra <Select>/chips rendered next to the search box
  action?: ReactNode; // primary button(s) — grouped here, not floating above
}

// The grouped search + filters + primary-action bar that sits as the top
// section of a list's card (directly above its table), so the whole list —
// search, filters, "Add X" — reads as one connected panel instead of
// separate floating pieces.
export default function Toolbar({ searchValue, onSearchChange, searchPlaceholder, filters, action }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-surface">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {onSearchChange && (
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search…'}
              className="pl-10 !rounded-full !h-10"
            />
          </div>
        )}
        {filters}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}
