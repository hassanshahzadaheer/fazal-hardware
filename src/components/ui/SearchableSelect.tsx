import { useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from './Input';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Adds a first "— None —" entry that clears the value. */
  clearable?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  'data-nav'?: string;
}

// Type-to-filter dropdown that works from the keyboard alone:
//  - Enter on a closed field opens the list; arrows move; Enter picks the highlighted entry.
//  - After picking with Enter the keydown is allowed to bubble, so a surrounding form that treats
//    Enter as Tab moves on to the next field. Opening / empty-result Enter never bubbles.
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  clearable = true,
  required,
  autoFocus,
  className = '',
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return clearable && !q ? [{ value: '', label: '— None —' }, ...filtered] : filtered;
  }, [options, query, clearable]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const openList = () => {
    setOpen(true);
    // Start on the current selection so Enter-Enter keeps the value.
    const idx = visible.findIndex((o) => o.value === value);
    setHighlight(Math.max(0, idx));
  };
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (opt: SelectOption | undefined) => {
    if (opt) onChange(opt.value);
    close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        if (!open) {
          e.preventDefault();
          e.stopPropagation();
          openList();
        } else if (visible.length === 0) {
          e.preventDefault();
          e.stopPropagation();
          close();
        } else {
          choose(visible[highlight]); // let it bubble: form advances to the next field
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openList();
        else setHighlight((h) => Math.min(h + 1, visible.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Escape':
        if (open) {
          e.stopPropagation(); // close the list, not the surrounding dialog
          close();
        }
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        {...rest}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        required={required && !value}
        value={open ? query : selected?.label ?? ''}
        placeholder={selected ? selected.label : placeholder}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={close}
        className={`pr-9 ${className}`}
      />
      <ChevronDown className="w-4 h-4 text-ink-faint absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 w-full bg-surface border border-border rounded-md shadow-md max-h-56 overflow-y-auto py-1"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-faint">No matches</li>
          ) : (
            visible.map((o, i) => (
              <li
                key={o.value || '__none'}
                role="option"
                aria-selected={o.value === value}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus on the input
                  choose(o);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-1.5 text-sm cursor-pointer ${
                  i === highlight ? 'bg-surface-sunken text-ink' : 'text-ink-muted'
                } ${o.value === value ? 'font-medium text-ink' : ''} ${o.value === '' ? 'italic' : ''}`}
              >
                {o.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
