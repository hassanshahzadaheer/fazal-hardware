import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LicenseService, LicenseStorage } from './service';
import { SignedLease } from './lease';
import { getSecret, setSecret, deleteSecret } from '../secrets/secureStore';
import { getDeviceId, getDeviceName } from './deviceId';
import { ALLOW_INSECURE_LOCALHOST, LICENSE_PUBLIC_KEY_PEM, LICENSE_SERVER_URL } from './config';

const dir = () => app.getPath('userData');
const leasePath = () => path.join(dir(), 'license-lease.json');
const highWaterPath = () => path.join(dir(), 'license-clock.json');

// The lease is signed (tamper-evident) and not secret, so a plain file is fine.
// The activation KEY is a credential and goes through OS-backed secure storage.
const storage: LicenseStorage = {
  readLease() {
    try { return JSON.parse(fs.readFileSync(leasePath(), 'utf8')) as SignedLease; } catch { return null; }
  },
  writeLease(lease) {
    fs.writeFileSync(leasePath(), JSON.stringify(lease), 'utf8');
  },
  readHighWaterMs() {
    try { return Number(JSON.parse(fs.readFileSync(highWaterPath(), 'utf8')).ms) || 0; } catch { return 0; }
  },
  writeHighWaterMs(ms) {
    fs.writeFileSync(highWaterPath(), JSON.stringify({ ms }), 'utf8');
  },
  getKey: () => getSecret('license-key'),
  setKey: (k) => setSecret('license-key', k),
  clearKey: () => {
    deleteSecret('license-key');
    fs.rmSync(leasePath(), { force: true });
  },
};

let service: LicenseService | null = null;

export function getLicenseService(): LicenseService {
  if (!service) {
    service = new LicenseService({
      serverUrl: LICENSE_SERVER_URL,
      publicKeyPem: LICENSE_PUBLIC_KEY_PEM,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      appVersion: app.getVersion(),
      storage,
      allowInsecureLocalhost: !app.isPackaged || ALLOW_INSECURE_LOCALHOST,
    });
  }
  return service;
}
