import { FormEvent, useState } from 'react';
import { KeyRound, Store, ShieldCheck, Sparkles, DatabaseBackup } from 'lucide-react';
import { Button, Field, Input, Banner } from '../../components/ui';
import { notify } from '../../components/shared/NotificationProvider';
import { useGateStore } from '../../stores/licenseStore';
import { RESTRICTION_TEXT } from '../license/LicenseBanner';
import { LicenseStatus } from '../../../shared/types';

type Step = 'activate' | 'shop' | 'admin' | 'ai';

// First-run wizard. One standard installer for every customer: the customer types
// their personal activation key, shop details and (optionally) their own Gemini key.
// Steps adapt: an upgraded install that already completed setup only sees activation.
export default function SetupWizard() {
  const { license, setup, setLicense, setSetup } = useGateStore();
  const needsActivation = !license || license.state === 'unactivated';
  const needsSetup = !setup?.setupCompleted;
  const steps: Step[] = [...(needsActivation ? ['activate' as Step] : []), ...(needsSetup ? (['shop', 'admin', 'ai'] as Step[]) : [])];
  const [step, setStep] = useState<Step>(steps[0] ?? 'activate');
  const idx = steps.indexOf(step);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [shop, setShop] = useState({ companyName: '', address: '', phone: '', email: '' });
  const [admin, setAdmin] = useState({ email: '', password: '', confirm: '' });
  const [gemini, setGemini] = useState('');

  const next = () => { setError(''); setStep(steps[Math.min(idx + 1, steps.length - 1)]); };

  const activate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await window.api.license.activate(key);
    setBusy(false);
    if (!res.ok) { setError(res.error.message); return; }
    setLicense(res.data);
    const st = res.data as LicenseStatus;
    if (st.state === 'restricted') { setError(RESTRICTION_TEXT[st.reason]); return; }
    if (steps.length > 1) next(); // gate re-renders away on its own if nothing else is needed
  };

  const finish = async (e?: FormEvent) => {
    e?.preventDefault();
    if (admin.password !== admin.confirm) { setStep('admin'); setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    const res = await window.api.setup.complete({
      ...shop,
      admin: admin.email || admin.password ? { email: admin.email, password: admin.password } : undefined,
    });
    if (!res.ok) { setBusy(false); setError(res.error.message); setStep(res.error.code === 'EMAIL_TAKEN' ? 'admin' : 'shop'); return; }
    // The Gemini key is optional and stored only in OS-backed secure storage on this PC.
    if (gemini.trim()) {
      const g = await window.api.gemini.save(gemini);
      if (!g.ok) notify(`Setup finished, but the Gemini key was not saved: ${g.error.message}`, 'error');
    }
    setBusy(false);
    setSetup(res.data);
  };

  const backupFirst = async () => {
    const r = await window.api.backup.now();
    if (r.ok) notify(`Backup saved to ${r.data}`, 'success');
    else if (r.error.code !== 'CANCELLED') notify(r.error.message, 'error');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas font-sans p-6">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-2 mb-6 text-[12px] text-ink-faint">
          {steps.map((s, i) => (
            <span key={s} className={i === idx ? 'text-accent font-semibold' : ''}>{i + 1}. {{ activate: 'Activate', shop: 'Shop', admin: 'Admin', ai: 'AI Scanner' }[s]}{i < steps.length - 1 ? ' ›' : ''}</span>
          ))}
        </div>
        {error && <div className="mb-4"><Banner tone="danger">{error}</Banner></div>}

        {step === 'activate' && (
          <form onSubmit={activate} className="space-y-4">
            <Heading icon={KeyRound} title="Activate Fazal POS" sub="Enter the personal activation key you received from your vendor. This needs an internet connection once; afterwards the app works offline." />
            <Field label="Activation key" required>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="FAZL-XXXX-XXXX-XXXX-XXXX" autoFocus spellCheck={false} className="font-mono tracking-wide" />
            </Field>
            <Button type="submit" variant="primary" loading={busy} disabled={!key.trim()} className="w-full">Activate</Button>
            {setup?.hasExistingData && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-ink-muted mb-2">Your existing shop data is safe and untouched. You can back it up now:</p>
                <Button type="button" onClick={backupFirst}><DatabaseBackup className="w-3.5 h-3.5 mr-1.5" />Back up my data</Button>
              </div>
            )}
          </form>
        )}

        {step === 'shop' && (
          <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-4">
            <Heading icon={Store} title="Your shop" sub="Shown on printed invoices, quotations and purchase orders. You can change this later in Settings." />
            <Field label="Shop name" required><Input value={shop.companyName} onChange={(e) => setShop({ ...shop, companyName: e.target.value })} autoFocus /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone"><Input value={shop.phone} onChange={(e) => setShop({ ...shop, phone: e.target.value })} /></Field>
              <Field label="Email"><Input type="email" value={shop.email} onChange={(e) => setShop({ ...shop, email: e.target.value })} /></Field>
            </div>
            <Field label="Address"><Input value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} /></Field>
            <Button type="submit" variant="primary" disabled={!shop.companyName.trim()} className="w-full">Continue</Button>
          </form>
        )}

        {step === 'admin' && (
          <form onSubmit={(e) => { e.preventDefault(); if (admin.password !== admin.confirm) { setError('Passwords do not match.'); return; } next(); }} className="space-y-4">
            <Heading icon={ShieldCheck} title="Your login" sub="Choose the email and password you will use to sign in. This replaces the factory-default login." />
            <Field label="Admin email" required><Input type="email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} autoFocus /></Field>
            <Field label="Password" required hint="At least 8 characters."><Input type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} /></Field>
            <Field label="Repeat password" required><Input type="password" value={admin.confirm} onChange={(e) => setAdmin({ ...admin, confirm: e.target.value })} /></Field>
            <Button type="submit" variant="primary" disabled={!admin.email || admin.password.length < 8} className="w-full">Continue</Button>
          </form>
        )}

        {step === 'ai' && (
          <form onSubmit={finish} className="space-y-4">
            <Heading icon={Sparkles} title="AI Invoice Scanner (optional)" sub="To scan supplier invoices, paste your own Google Gemini API key. It is stored encrypted on this computer only — never sent to us. Skip it now and add it later in Settings; everything else works without it." />
            <Field label="Gemini API key" hint="Get one free at aistudio.google.com/apikey">
              <Input type="password" value={gemini} onChange={(e) => setGemini(e.target.value)} placeholder="AIza…" autoComplete="off" spellCheck={false} />
            </Field>
            <div className="flex gap-3">
              <Button type="button" onClick={() => { setGemini(''); void finish(); }} disabled={busy} className="flex-1">Skip for now</Button>
              <Button type="submit" variant="primary" loading={busy} className="flex-1">Finish setup</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Heading({ icon: Icon, title, sub }: { icon: typeof KeyRound; title: string; sub: string }) {
  return (
    <div className="mb-2">
      <div className="w-11 h-11 rounded-lg bg-accent-soft text-accent flex items-center justify-center mb-3"><Icon className="w-5 h-5" /></div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="text-[13px] text-ink-muted mt-1">{sub}</p>
    </div>
  );
}
