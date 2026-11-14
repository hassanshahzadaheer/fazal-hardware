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

export default function UserMenu() {
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
          className={`absolute top-full mt-2 right-0 w-64 bg-surface border border-border rounded-lg shadow-lg py-1.5 animate-scale-in z-20`}
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
        className="flex items-center gap-2.5 pl-1.5 pr-3.5 h-11 rounded-full bg-surface border border-border hover:border-border-strong transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
          {initials(user.fullName, user.email)}
        </div>
        <div className="text-left min-w-0 hidden sm:block">
          <p className="text-[12.5px] font-medium text-ink truncate leading-tight max-w-[140px]">{user.fullName ?? user.email}</p>
          <p className="text-[11px] text-ink-faint truncate leading-tight max-w-[140px] capitalize">{user.role}</p>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-ink-faint shrink-0" />
      </button>
    </div>
  );
}
