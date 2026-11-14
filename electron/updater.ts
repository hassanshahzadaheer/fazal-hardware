import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { Result, UpdateState } from '../shared/types';

// In-app updates from GitHub Releases (public repo: hassanshahzadaheer/fazal-hardware,
// configured in package.json build.publish — no token is ever needed or shipped).
//
// Policy:
//  - Checks run in the background (launch + every 6h) and download silently.
//  - NOTHING restarts the app by itself. Installing is an explicit user action,
//    refused while a sale/bill is open (billingActive), and an update downloaded
//    but not yet applied is only ever installed on a normal user-initiated quit.
//  - Windows installer signatures are verified by electron-updater whenever the
//    build's publisherName is configured (see docs/RELEASING.md); we never turn that off.

let state: UpdateState = { state: 'idle', currentVersion: app.getVersion(), lastCheckedAt: null };
let billingActive = false;
let getWindow: () => BrowserWindow | null = () => null;
let timer: NodeJS.Timeout | undefined;

function setState(next: UpdateState): void {
  state = next;
  getWindow()?.webContents.send('updater:state', state);
}

export function setBillingActive(active: boolean): void {
  billingActive = active;
}

export function getUpdateState(): UpdateState {
  return state;
}

export function initUpdater(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter;
  const currentVersion = app.getVersion();

  if (!app.isPackaged) {
    state = { state: 'unsupported', currentVersion, message: 'Updates are only available in the installed app, not in development.' };
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // applies on the user's next normal quit, never mid-session
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => setState({ state: 'checking', currentVersion }));
  autoUpdater.on('update-available', (info) => setState({ state: 'available', currentVersion, version: info.version }));
  autoUpdater.on('update-not-available', () =>
    setState({ state: 'not-available', currentVersion, lastCheckedAt: new Date().toISOString() }));
  autoUpdater.on('download-progress', (p) =>
    setState({
      state: 'downloading', currentVersion,
      version: (state as any).version ?? '',
      percent: Math.round(p.percent), bytesPerSecond: p.bytesPerSecond,
    }));
  autoUpdater.on('update-downloaded', (info) => setState({ state: 'downloaded', currentVersion, version: info.version }));
  autoUpdater.on('error', (err) => {
    log.warn('Updater error:', err);
    setState({ state: 'error', currentVersion, message: friendlyError(err) });
  });

  setTimeout(() => void checkForUpdates(), 30_000).unref();
  timer = setInterval(() => void checkForUpdates(), 6 * 3_600_000);
  timer.unref();
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|net::|network/i.test(msg)) {
    return 'Could not reach the update server. Check the internet connection and try again.';
  }
  return 'The update check failed. Your data and the current version are unaffected.';
}

export async function checkForUpdates(): Promise<Result<UpdateState>> {
  if (state.state === 'unsupported') return { ok: true, data: state };
  // Don't restart a download that is already in progress or finished.
  if (state.state === 'downloading' || state.state === 'downloaded') return { ok: true, data: state };
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setState({ state: 'error', currentVersion: app.getVersion(), message: friendlyError(err) });
  }
  return { ok: true, data: state };
}

/** Explicit "Restart and update". Never during billing; silent NSIS install; relaunches after. */
export function installUpdate(): Result<null> {
  if (state.state !== 'downloaded') {
    return { ok: false, error: { code: 'NO_UPDATE', message: 'No downloaded update is ready to install.' } };
  }
  if (billingActive) {
    return {
      ok: false,
      error: { code: 'BILLING_ACTIVE', message: 'A bill is open. Finish or cancel it, then restart to update.' },
    };
  }
  // isSilent=true avoids the installer wizard (our NSIS is not one-click);
  // isForceRunAfter=true relaunches the app when the install completes.
  autoUpdater.quitAndInstall(true, true);
  return { ok: true, data: null };
}

export function stopUpdater(): void {
  if (timer) clearInterval(timer);
}
