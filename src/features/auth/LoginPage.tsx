import { useState, FormEvent } from 'react';
import { WifiOff, ScanLine, HandCoins } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Button, Field, Input } from '../../components/ui';

const HIGHLIGHTS = [
  { icon: WifiOff, text: 'Offline-first — runs on your counter with or without internet' },
  { icon: ScanLine, text: 'Scan a supplier invoice and let AI turn it into a draft purchase' },
  { icon: HandCoins, text: 'Track customer credit, payments, and balances in one ledger' },
];

export default function LoginPage() {
  const { login, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex bg-canvas font-sans">
      {/* Branding panel — hidden on narrow windows, form panel alone still works down to minWidth. */}
      <div
        className="hidden lg:flex lg:w-[44%] relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(160deg, #1C3899 0%, #2F5FEE 58%, #3D6CFF 100%)' }}
      >
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center font-bold text-lg">F</div>
          <span className="font-semibold text-lg tracking-tight">Fazal Hardware</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-[32px] font-semibold leading-tight tracking-tight mb-6">
            Run your hardware shop
            <br />
            from one screen.
          </h2>
          <ul className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="shrink-0 w-7 h-7 rounded-md bg-white/15 flex items-center justify-center mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[13.5px] text-white/85 leading-5">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">Fazal Hardware • Offline-First Inventory & Billing</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-white font-bold text-lg">
              F
            </div>
            <span className="font-semibold text-lg text-ink">Fazal Hardware</span>
          </div>

          <h1 className="text-[20px] font-semibold text-ink tracking-tight mb-1">Welcome back</h1>
          <p className="text-[13px] text-ink-muted mb-6">Sign in with your shop account to continue.</p>

          {error && (
            <div className="mb-4 text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Field label="Email">
            <Input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@fazalhardware.local"
            />
          </Field>

          <div className="h-4" />

          <Field label="Password">
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password"
            />
          </Field>

          <div className="h-6" />

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
