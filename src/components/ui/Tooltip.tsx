import { ReactNode, useState, useId } from 'react';

interface Props {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

// Lightweight hover/focus tooltip — no portal needed since every usage sits
// inside a scroll container that doesn't clip at these distances.
export default function Tooltip({ content, children, side = 'top', className = 'inline-flex' }: Props) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const positionCls =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
      : 'top-full left-1/2 -translate-x-1/2 mt-1.5';

  return (
    <span
      className={`relative ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} className="flex-1 min-w-0">
        {children}
      </span>
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={`absolute z-50 ${positionCls} whitespace-nowrap px-2 py-1 rounded-md bg-shell text-white text-[11px] font-medium shadow-md animate-fade-in pointer-events-none`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
