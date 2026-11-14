import * as fs from 'fs';
import * as path from 'path';
import { app, safeStorage } from 'electron';

// OS-backed secret storage (Windows DPAPI / macOS Keychain / Linux libsecret via
// Electron's safeStorage). Values are encrypted by the OS before touching disk,
// live only in the main process, and are never handed to the renderer.
// The renderer can only ask "is it configured" via the handlers in main.ts.

export type SecretName = 'gemini-api-key' | 'license-key';

type Blob = Partial<Record<SecretName, string>>; // name -> base64 ciphertext

function storePath(): string {
  return path.join(app.getPath('userData'), 'secrets.bin.json');
}

function readBlob(): Blob {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf8')) as Blob;
  } catch {
    return {};
  }
}

function writeBlob(blob: Blob): void {
  const target = storePath();
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(blob), { mode: 0o600 });
  fs.renameSync(tmp, target); // atomic replace: a crash never leaves a half-written file
}

export function isSecureStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

export function setSecret(name: SecretName, value: string): void {
  // Refuse rather than fall back to plaintext: a missing OS keyring must be a
  // visible error, never a silent downgrade.
  if (!isSecureStorageAvailable()) {
    throw new Error('Secure storage is not available on this computer, so the value was not saved.');
  }
  const blob = readBlob();
  blob[name] = safeStorage.encryptString(value).toString('base64');
  writeBlob(blob);
}

export function getSecret(name: SecretName): string | null {
  const cipher = readBlob()[name];
  if (!cipher || !isSecureStorageAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'));
  } catch {
    return null; // undecryptable (e.g. different OS user) -> treated as not configured
  }
}

export function hasSecret(name: SecretName): boolean {
  return Boolean(readBlob()[name]);
}

export function deleteSecret(name: SecretName): void {
  const blob = readBlob();
  if (name in blob) {
    delete blob[name];
    writeBlob(blob);
  }
}
