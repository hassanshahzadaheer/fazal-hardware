import { useEffect, useState } from 'react';
import { RefreshCw, Download, RotateCw } from 'lucide-react';
import { Banner, Button } from '../../components/ui';
import { notify } from '../../components/shared/NotificationProvider';
import { UpdateState } from '../../../shared/types';

export default function UpdatesTab() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    window.api.updater.getState().then((r: any) => r.ok && setState(r.data));
    window.api.app.getVersion().then((r: any) => r.ok && setVersion(r.data));
    return window.api.updater.onState(setState);
  }, []);

  const check = async () => {
    const r = await window.api.updater.check();
    if (r.ok) setState(r.data);
  };
  const install = async () => {
    const r = await window.api.updater.install();
    // On success the app quits and relaunches; only failures (e.g. an open bill) come back.
    if (!r.ok) notify(r.error.message, 'error');
  };

  const busy = state?.state === 'checking' || state?.state === 'downloading';

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold text-ink">Updates</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Installed version <span className="font-medium text-ink">{version || '…'}</span></p>
      </div>

      <div className="max-w-xl space-y-4">
        {state?.state === 'unsupported' && <Banner tone="info">{state.message}</Banner>}
        {state?.state === 'error' && <Banner tone="danger">{state.message}</Banner>}
        {state?.state === 'not-available' && <Banner tone="success">You're up to date. Last checked {new Date(state.lastCheckedAt).toLocaleString()}.</Banner>}
        {state?.state === 'available' && <Banner tone="info">Version {state.version} is available and is starting to download.</Banner>}

        {state?.state === 'downloading' && (
          <div className="rounded-md border border-border p-4">
            <p className="text-sm text-ink mb-2 flex items-center gap-2"><Download className="w-4 h-4" />Downloading version {state.version}… {state.percent}%</p>
            <div className="h-2 rounded bg-surface-sunken overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${state.percent}%` }} /></div>
            <p className="text-xs text-ink-faint mt-1.5">{(state.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s — you can keep working.</p>
          </div>
        )}

        {state?.state === 'downloaded' && (
          <div className="rounded-md border border-accent-soft-border bg-accent-soft p-4">
            <p className="text-sm font-medium text-ink">Version {state.version} is ready to install.</p>
            <p className="text-xs text-ink-muted mt-1 mb-3">
              Restarting takes under a minute. Your sales, stock and all data stay exactly as they are. Finish any open bill first —
              the app will not restart while a bill is open. If you don't restart now, the update installs the next time you close the app.
            </p>
            <Button variant="primary" onClick={install}><RotateCw className="w-3.5 h-3.5 mr-1.5" />Restart and update</Button>
          </div>
        )}

        <Button onClick={check} loading={state?.state === 'checking'} disabled={busy || state?.state === 'downloaded' || state?.state === 'unsupported'}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Check for updates
        </Button>

        <div className="text-xs text-ink-muted border-t border-border pt-4 leading-5">
          <p className="font-medium text-ink mb-1">About updates</p>
          <p>The app checks for new versions automatically and downloads them in the background. It never restarts by itself.</p>
          <p className="mt-2"><strong>One-time step for older installations:</strong> copies installed before in-app updates existed (version 1.0.x) cannot update themselves.
            Install the first updater-enabled version (1.1.0 or later) once by running its installer over the existing app — keep the same install location.
            Your data is stored separately and is preserved. From then on, every update is one click here.</p>
        </div>
      </div>
    </div>
  );
}
