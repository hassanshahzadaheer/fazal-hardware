import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLicenseStore } from '../../stores/licenseStore';
import { Button } from '../../components/ui';

const MESSAGES: Record<string, { title: string; body: string }> = {
  missing: {
    title: 'License required',
    body: 'This copy of Fazal Hardware has not been activated yet. Import the license file you received to continue.',
  },
  expired: {
    title: 'License expired',
    body: 'Your license has expired. Contact Fazal Hardware to renew, then import the new license file.',
  },
  invalid: {
    title: 'License invalid',
    body: 'The installed license file could not be verified. Import a valid license file to continue.',
  },
};

export default function LicenseLockedPage() {
  const { status, importLicense } = useLicenseStore();
  const [importing, setImporting] = useState(false);

  const state = status?.state === 'valid' ? 'invalid' : status?.state ?? 'invalid';
  const { title, body } = MESSAGES[state] ?? MESSAGES.invalid;
  const expiresAt = status && 'expiresAt' in status ? status.expiresAt : null;

  const handleImport = async () => {
    setImporting(true);
    await importLicense();
    setImporting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas font-sans p-6">
      <div className="max-w-sm w-full bg-surface text-ink p-8 rounded-lg shadow-lg border border-border text-center">
        <div className="w-14 h-14 bg-danger-soft text-danger rounded-lg flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-ink-muted mb-2">{body}</p>
        {expiresAt && (
          <p className="text-xs text-ink-faint mb-6">Expired on {new Date(expiresAt).toLocaleDateString()}</p>
        )}
        {!expiresAt && <div className="mb-6" />}
        <Button variant="primary" loading={importing} onClick={handleImport} className="w-full">
          Import License File
        </Button>
      </div>
    </div>
  );
}
