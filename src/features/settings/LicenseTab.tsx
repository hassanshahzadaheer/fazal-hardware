import { useState } from 'react';
import { Banner, Button, Field, Input } from '../../components/ui';
import { notify } from '../../components/shared/NotificationProvider';
import { useGateStore } from '../../stores/licenseStore';
import { RESTRICTION_TEXT } from '../license/LicenseBanner';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export default function LicenseTab() {
  const { license, setLicense } = useGateStore();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');

  const checkNow = async () => {
    setBusy(true);
    const r = await window.api.license.refresh();
    setBusy(false);
    if (r.ok) { setLicense(r.data); notify(r.data.state === 'active' ? 'Licence confirmed.' : 'Checked — see status below.', r.data.state === 'active' ? 'success' : 'info'); }
    else notify(r.error.message, 'error');
  };
  const activate = async () => {
    setBusy(true);
    const r = await window.api.license.activate(key);
    setBusy(false);
    if (!r.ok) return notify(r.error.message, 'error');
    setLicense(r.data); setKey('');
    notify(r.data.state === 'active' ? 'Activated.' : 'Key accepted, but the licence is not active — see status.', r.data.state === 'active' ? 'success' : 'error');
  };
  const backup = async () => { const r = await window.api.backup.now(); if (r.ok) notify(`Backup saved to ${r.data}`, 'success'); else if (r.error.code !== 'CANCELLED') notify(r.error.message, 'error'); };
  const exportCsv = async () => { const r = await window.api.backup.exportCsv(); if (r.ok) notify(`Exported to ${r.data}`, 'success'); else if (r.error.code !== 'CANCELLED') notify(r.error.message, 'error'); };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">Licence</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Activation status of this computer.</p>
      </div>
      <div className="max-w-xl space-y-4">
        {license?.state === 'active' && (
          <div className="rounded-md border border-border p-4 text-sm space-y-1">
            <p><span className="text-ink-muted">Licensed to:</span> <strong>{license.customerName}</strong></p>
            <p><span className="text-ink-muted">Licence expires:</span> {license.expiresAt ? fmt(license.expiresAt) : 'never'}</p>
            <p><span className="text-ink-muted">Last confirmed online:</span> {fmt(license.lastCheckedAt)}</p>
            <p><span className="text-ink-muted">Works offline until:</span> {fmt(license.graceEndsAt)} <span className="text-ink-faint">({license.graceDays}-day offline allowance)</span></p>
            {license.lastCheckError && <p className="text-warning text-xs">Last online check failed: {license.lastCheckError}</p>}
          </div>
        )}
        {license?.state === 'restricted' && (
          <Banner tone="danger" title="Read-only mode">{RESTRICTION_TEXT[license.reason]} Your data is untouched and can be backed up and exported below.</Banner>
        )}
        {license?.state === 'unactivated' && <Banner tone="info">This computer is not activated.</Banner>}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkNow} loading={busy} disabled={license?.state === 'unactivated'}>Check now</Button>
          <Button onClick={backup}>Back up data</Button>
          <Button onClick={exportCsv}>Export data (CSV)</Button>
        </div>

        <div className="border-t border-border pt-4">
          <Field label={license?.state === 'active' ? 'Activate with a different key' : 'Enter activation key'}>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="FAZL-XXXX-XXXX-XXXX-XXXX" spellCheck={false} className="font-mono" />
          </Field>
          <Button className="mt-2" onClick={activate} loading={busy} disabled={!key.trim()}>Activate</Button>
        </div>

        <div className="text-xs text-ink-muted border-t border-border pt-4 leading-5">
          <p className="font-medium text-ink mb-1">How licensing works offline</p>
          <p>Activation needs the internet once. After that the app keeps working without internet and re-confirms the licence in the background whenever it is online.</p>
          <p className="mt-2">A suspended or revoked licence cannot take effect on a computer that is offline — it applies the next time that computer connects, or when its offline allowance runs out, whichever is first.</p>
          <p className="mt-2">If a licence ever becomes restricted, the app becomes read-only. <strong>No business data is ever deleted</strong>, and backup and export always stay available.</p>
        </div>
      </div>
    </div>
  );
}
