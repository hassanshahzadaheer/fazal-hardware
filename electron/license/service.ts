import * as crypto from 'crypto';
import { LicenseStatus, Result } from '../../shared/types';
import { evaluateLease, isWellFormedLease, SignedLease, verifyLease } from './lease';

export interface LicenseStorage {
  readLease(): SignedLease | null;
  writeLease(lease: SignedLease): void;
  readHighWaterMs(): number;
  writeHighWaterMs(ms: number): void;
  getKey(): string | null;
  setKey(key: string): void;
  clearKey(): void;
}

export interface LicenseServiceDeps {
  serverUrl: string;
  publicKeyPem: string;
  deviceId: string;
  deviceName: string;
  appVersion: string;
  storage: LicenseStorage;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Dev/test only: permit http:// to localhost. Packaged builds require https. */
  allowInsecureLocalhost?: boolean;
}

const KEY_RE = /^FAZL(-[A-Z2-9]{4}){4}$/;

export function normalizeActivationKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export class LicenseService {
  private lastCheckError: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly deps: LicenseServiceDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.now = deps.now ?? (() => new Date());
  }

  /** Local-only evaluation: never touches the network, so POS works offline. */
  getStatus(): LicenseStatus {
    const { storage, publicKeyPem, deviceId } = this.deps;
    const now = this.now();
    const status = evaluateLease(storage.readLease(), publicKeyPem, deviceId, now, storage.readHighWaterMs());
    // Ratchet the high-water mark so winding the clock back is detectable.
    if (now.getTime() > storage.readHighWaterMs() && status.state !== 'restricted') {
      storage.writeHighWaterMs(now.getTime());
    }
    if (status.state === 'active' && this.lastCheckError) {
      return { ...status, lastCheckError: this.lastCheckError };
    }
    return status;
  }

  async activate(rawKey: string): Promise<Result<LicenseStatus>> {
    const key = normalizeActivationKey(rawKey);
    if (!KEY_RE.test(key)) {
      return { ok: false, error: { code: 'INVALID_KEY_FORMAT', message: 'Activation keys look like FAZL-XXXX-XXXX-XXXX-XXXX.' } };
    }
    const res = await this.call('activate', key);
    if (!res.ok) return res;
    try {
      this.deps.storage.setKey(key);
    } catch (err: any) {
      // No secure storage => we cannot keep the key for rechecks; don't leave a half-activation behind.
      this.deps.storage.clearKey();
      return { ok: false, error: { code: 'SECURE_STORAGE_UNAVAILABLE', message: err.message } };
    }
    return { ok: true, data: this.getStatus() };
  }

  /** Re-validate against the server. Network failure leaves the existing lease untouched. */
  async refresh(): Promise<Result<LicenseStatus>> {
    const key = this.deps.storage.getKey();
    if (!key) return { ok: false, error: { code: 'NOT_ACTIVATED', message: 'This computer is not activated.' } };
    const res = await this.call('validate', key);
    if (!res.ok) {
      if (res.error.code === 'NETWORK') this.lastCheckError = res.error.message;
      return res;
    }
    return { ok: true, data: this.getStatus() };
  }

  async refreshIfDue(): Promise<void> {
    const s = this.getStatus();
    if (s.state === 'active' && s.recheckDue) await this.refresh();
    // A restricted licence is rechecked too: the owner may have reactivated it.
    else if (s.state === 'restricted' && this.deps.storage.getKey()) await this.refresh();
  }

  /** Frees this device's seat on the server (best effort) and forgets local activation. */
  async deactivate(): Promise<Result<null>> {
    const key = this.deps.storage.getKey();
    if (key) await this.call('deactivate', key).catch(() => undefined);
    this.deps.storage.clearKey();
    return { ok: true, data: null };
  }

  private urlFor(action: string): string | null {
    let u: URL;
    try {
      u = new URL(`/api/v1/${action}`, this.deps.serverUrl);
    } catch {
      return null;
    }
    const localhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol === 'https:' || (u.protocol === 'http:' && localhost && this.deps.allowInsecureLocalhost)) {
      return u.toString();
    }
    return null;
  }

  private async call(action: 'activate' | 'validate' | 'deactivate', key: string): Promise<Result<null>> {
    const url = this.urlFor(action);
    if (!url) {
      return { ok: false, error: { code: 'BAD_SERVER_URL', message: 'The licence server address is not a valid HTTPS URL.' } };
    }
    const nonce = crypto.randomBytes(16).toString('hex');
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          deviceId: this.deps.deviceId,
          deviceName: this.deps.deviceName,
          appVersion: this.deps.appVersion,
          nonce,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { ok: false, error: { code: 'NETWORK', message: 'Could not reach the licence server. Check the internet connection.' } };
    }

    let body: any;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: { code: 'BAD_RESPONSE', message: 'The licence server sent an unreadable reply.' } };
    }

    if (action === 'deactivate') return response.ok ? { ok: true, data: null } : { ok: false, error: { code: 'DEACTIVATE_FAILED', message: body?.message ?? 'Failed' } };

    // Unsigned errors (unknown key, device limit, ...) never change local state.
    if (!response.ok || !body?.lease) {
      return { ok: false, error: { code: body?.code ?? 'SERVER_ERROR', message: body?.message ?? `Licence server error (${response.status}).` } };
    }

    // Anything that DOES change local state must be a validly signed lease for
    // this device and echo our nonce.
    const lease = body.lease as SignedLease;
    if (
      !isWellFormedLease(lease) ||
      !verifyLease(lease, this.deps.publicKeyPem) ||
      lease.payload.deviceId !== this.deps.deviceId ||
      lease.payload.nonce !== nonce
    ) {
      return { ok: false, error: { code: 'BAD_SIGNATURE', message: 'The licence server reply could not be verified.' } };
    }
    this.deps.storage.writeLease(lease);
    // Server time is trusted: re-anchor the clock high-water mark to it. This is how a
    // legitimately-corrected clock recovers (it requires being online).
    this.deps.storage.writeHighWaterMs(Math.max(this.now().getTime(), Date.parse(lease.payload.issuedAt)));
    this.lastCheckError = undefined;
    return { ok: true, data: null };
  }
}
