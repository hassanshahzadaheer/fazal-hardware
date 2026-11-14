import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import dayjs from 'dayjs';
import { NAV_GROUPS } from './Sidebar';
import UserMenu from './UserMenu';

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

// Global "go to" search: type a page name, Enter to jump. Ctrl/Cmd+K focuses it from anywhere.
export default function TopBar() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const all = NAV_GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
    const q = query.trim().toLowerCase();
    return q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, []);

  const go = (to: string) => {
    navigate(to);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <header className="h-[72px] px-8 flex items-center justify-between gap-4 shrink-0">
      <div ref={wrapRef} className="relative w-full max-w-md">
        <Search className="w-4 h-4 text-ink-faint absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && results[active]) go(results[active].to);
            else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Go to page…"
          className="w-full h-11 pl-11 pr-20 rounded-full bg-surface border border-border text-sm placeholder:text-ink-faint hover:border-border-strong focus:outline-none focus:border-ink/40 focus:shadow-focus transition-shadow"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-full bg-accent text-white text-[11.5px] font-medium inline-flex items-center pointer-events-none">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
        {open && (
          <ul className="absolute z-30 mt-2 w-full bg-surface border border-border rounded-lg shadow-lg py-1.5 max-h-80 overflow-y-auto animate-scale-in">
            {results.length === 0 && <li className="px-4 py-2.5 text-sm text-ink-faint">No matching pages</li>}
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <li
                  key={r.to}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(r.to);
                  }}
                  className={`mx-1.5 px-3 h-10 rounded-md flex items-center gap-3 cursor-pointer text-sm ${
                    i === active ? 'bg-surface-sunken text-ink' : 'text-ink-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span className="flex-1">{r.label}</span>
                  <span className="text-xs text-ink-faint">{r.group}</span>
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-ink-faint" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <span className="hidden md:block text-[13px] text-ink-muted">{dayjs().format('ddd, D MMM YYYY')}</span>
        <UserMenu />
      </div>
    </header>
  );
}
