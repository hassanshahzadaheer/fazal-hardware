import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Banner, Button, Field, Input, confirmDialog } from '../../components/ui';
import { notify } from '../../components/shared/NotificationProvider';

interface Status { configured: boolean; hint: string | null; secureStorageAvailable: boolean }

export default function AiScannerTab() {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | 'clear' | null>(null);

  const refresh = () => window.api.gemini.getStatus().then((r: any) => r.ok && setStatus(r.data));
  useEffect(() => { void refresh(); }, []);

  const save = async () => {
    setBusy('save');
    const r = await window.api.gemini.save(key);
    setBusy(null);
    if (!r.ok) return notify(r.error.message, 'error');
    setKey('');
    setStatus(r.data);
    notify('Gemini API key saved securely on this computer.', 'success');
  };
  const test = async () => {
    setBusy('test');
    const r = await window.api.gemini.test(key.trim() || undefined);
    setBusy(null);
    notify(r.ok ? 'The key works.' : r.error.message, r.ok ? 'success' : 'error');
  };
  const clear = async () => {
    if (!(await confirmDialog({ title: 'Remove Gemini key?', description: 'The AI Invoice Scanner will stop working until you add a key again. Nothing else is affected.', confirmLabel: 'Remove', tone: 'danger' }))) return;
    setBusy('clear');
    const r = await window.api.gemini.clear();
    setBusy(null);
    if (r.ok) setStatus(r.data);
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">AI Invoice Scanner</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Your own Google Gemini API key, used only to read supplier invoices.</p>
      </div>
      <div className="max-w-xl space-y-4">
        {status && !status.secureStorageAvailable && (
          <Banner tone="danger">Secure storage is not available on this computer, so a key cannot be saved safely. The rest of the app is unaffected.</Banner>
        )}
        {status?.configured ? (
          <Banner tone="success"><span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" />A key ending in <strong>{status.hint}</strong> is saved (encrypted on this PC).</span></Banner>
        ) : (
          <Banner tone="info">No key saved. The scanner is off; billing, stock and everything else work normally.</Banner>
        )}
        <Field label={status?.configured ? 'Replace key' : 'Gemini API key'} hint="Stored encrypted by Windows on this computer only — never sent to the vendor. Get a key at aistudio.google.com/apikey">
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="AIza…" autoComplete="off" spellCheck={false} />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} loading={busy === 'save'} disabled={!key.trim() || busy !== null}>Save key</Button>
          <Button onClick={test} loading={busy === 'test'} disabled={(!key.trim() && !status?.configured) || busy !== null}>Test key</Button>
          {status?.configured && <Button className="text-danger hover:bg-danger-soft" onClick={clear} loading={busy === 'clear'} disabled={busy !== null}>Remove key</Button>}
        </div>
      </div>
    </div>
  );
}
