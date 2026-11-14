import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LicenseStatus } from '../../shared/types';
import { evaluateLicenseFile } from './verify';
import { LICENSE_PUBLIC_KEY_PEM } from './publicKey';

function licenseFilePath(): string {
  return path.join(app.getPath('userData'), 'license.json');
}

export function getLicenseStatus(): LicenseStatus {
  const filePath = licenseFilePath();
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return { state: 'missing' };
  }
  return evaluateLicenseFile(raw, LICENSE_PUBLIC_KEY_PEM);
}

// Only persists the picked file as the active license when it's actually
// valid — an expired/invalid pick is reported back without overwriting
// whatever (possibly still-valid) license is already installed.
export function importLicenseFile(sourcePath: string): LicenseStatus {
  let raw: string;
  try {
    raw = fs.readFileSync(sourcePath, 'utf8');
  } catch {
    return { state: 'invalid' };
  }

  const status = evaluateLicenseFile(raw, LICENSE_PUBLIC_KEY_PEM);
  if (status.state === 'valid') {
    fs.writeFileSync(licenseFilePath(), raw, 'utf8');
  }
  return status;
}
