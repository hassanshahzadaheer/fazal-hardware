import { useEffect, useRef, useState } from 'react';
import { ChevronsUpDown, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { confirmDialog } from '../ui';
import { notify } from '../shared/NotificationProvider';

function initials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    const confirmed = await confirmDialog({
      title: 'Log out?',
      description: "You'll need your email and password to sign back in.",
      confirmLabel: 'Log out',
    });
    if (!confirmed) return;
    await logout();
    notify('Logged out', 'info');
  };

  return (
    <div className="relative" ref={ref}>
      {open && (
        <div
          className={`absolute bottom-full mb-2 ${collapsed ? 'left-full ml-2 w-56' : 'left-0 w-full'} bg-surface border border-border rounded-md shadow-lg py-1.5 animate-scale-in z-20`}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[13px] font-medium text-ink truncate">{user.fullName ?? 'User'}</p>
            <p className="text-[12px] text-ink-muted truncate">{user.email}</p>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded-full bg-accent-soft text-accent text-[10px] font-semibold uppercase tracking-wide">
              {user.role}
            </span>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-surface-sunken transition-colors"
          >
            <SettingsIcon className="w-4 h-4 text-ink-faint" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger-soft transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-shell-raised/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
          {initials(user.fullName, user.email)}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12.5px] font-medium text-white truncate leading-tight">{user.fullName ?? user.email}</p>
              <p className="text-[11px] text-white/45 truncate leading-tight">{user.email}</p>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
          </>
        )}
      </button>
    </div>
  );
}
