import { ReactNode, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

// Portal-rendered: an earlier version positioned the bubble with
// `absolute` inside the trigger's own ancestor chain, which — for any
// trigger sitting inside a horizontally-scrollable table — silently grew
// that container's scrollable area the moment the bubble overflowed its
// edge, popping a horizontal scrollbar just from hovering an icon. Rendering
// into document.body with `position: fixed` coordinates computed from the
// trigger's real bounding rect sidesteps that entirely.
export default function Tooltip({ content, children, side = 'top', className = 'inline-flex' }: Props) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: side === 'top' ? rect.top - 6 : rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  };
  const hide = () => setVisible(false);

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <span aria-describedby={visible ? id : undefined} className="flex-1 min-w-0">
          {children}
        </span>
      </span>
      {visible &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
            className="z-[200] whitespace-nowrap px-2 py-1 rounded-md bg-shell text-white text-[11px] font-medium shadow-md animate-fade-in pointer-events-none"
          >
            {content}
          </span>,
          document.body
        )}
    </>
  );
}
