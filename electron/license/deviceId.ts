import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as os from 'os';
import { app } from 'electron';

// A stable, privacy-preserving device identifier: SHA-256 of the OS machine GUID
// salted with the app id (so it can't be correlated with other software's ids).
// Falls back to a random id persisted in userData if the OS value is unreadable.
function osMachineGuid(): string | null {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], {
        encoding: 'utf8', windowsHide: true, timeout: 5000,
      });
      return out.match(/MachineGuid\s+REG_SZ\s+(\S+)/)?.[1] ?? null;
    }
    if (process.platform === 'darwin') {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8', timeout: 5000 });
      return out.match(/"IOPlatformUUID" = "([^"]+)"/)?.[1] ?? null;
    }
    return fs.readFileSync('/etc/machine-id', 'utf8').trim() || null;
  } catch {
    return null;
  }
}

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;
  const guid = osMachineGuid();
  if (guid) {
    cached = crypto.createHash('sha256').update(`com.fazal.pos|${guid}`).digest('hex');
    return cached;
  }
  const file = path.join(app.getPath('userData'), 'device-id');
  try {
    cached = fs.readFileSync(file, 'utf8').trim();
  } catch {
    cached = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, cached, 'utf8');
  }
  return cached;
}

export function getDeviceName(): string {
  return os.hostname();
}
