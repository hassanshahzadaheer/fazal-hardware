import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fazal-secrets-'));
let encryptionAvailable = true;

// Fake "OS" cipher: reversible but visibly not plaintext, so the test can prove
// the file on disk never contains the raw secret.
vi.mock('electron', () => ({
  app: { getPath: () => dir },
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (v: string) => Buffer.from(`ENC:${Buffer.from(v).reverse().toString('hex')}`),
    decryptString: (b: Buffer) => Buffer.from(b.toString().slice(4), 'hex').reverse().toString(),
  },
}));

import { setSecret, getSecret, hasSecret, deleteSecret } from '../secureStore';
import { saveGeminiKey, getGeminiStatus, clearGeminiKey } from '../gemini';

const KEY = 'AIzaSyFAKE_TEST_KEY_1234567890abcdef';

describe('secure store', () => {
  beforeEach(() => {
    encryptionAvailable = true;
    fs.rmSync(path.join(dir, 'secrets.bin.json'), { force: true });
  });

  it('round-trips a secret and never writes it to disk in plaintext', () => {
    setSecret('gemini-api-key', KEY);
    expect(getSecret('gemini-api-key')).toBe(KEY);
    const onDisk = fs.readFileSync(path.join(dir, 'secrets.bin.json'), 'utf8');
    expect(onDisk).not.toContain(KEY);
    expect(onDisk).not.toContain('AIza');
  });

  it('refuses to store (no plaintext fallback) when OS encryption is unavailable', () => {
    encryptionAvailable = false;
    expect(() => setSecret('gemini-api-key', KEY)).toThrow(/not available/i);
    expect(fs.existsSync(path.join(dir, 'secrets.bin.json'))).toBe(false);
  });

  it('deletes secrets', () => {
    setSecret('license-key', 'FAZL-AAAA');
    expect(hasSecret('license-key')).toBe(true);
    deleteSecret('license-key');
    expect(hasSecret('license-key')).toBe(false);
    expect(getSecret('license-key')).toBeNull();
  });

  it('gemini status exposes only configured flag + last 4 chars, never the key', () => {
    expect(getGeminiStatus().configured).toBe(false);
    const res = saveGeminiKey(KEY);
    expect(res.ok).toBe(true);
    const status = getGeminiStatus();
    expect(status).toEqual({ configured: true, hint: KEY.slice(-4), secureStorageAvailable: true });
    expect(JSON.stringify(status)).not.toContain(KEY);
    clearGeminiKey();
    expect(getGeminiStatus().configured).toBe(false);
  });

  it('rejects obviously invalid gemini keys', () => {
    expect(saveGeminiKey('short').ok).toBe(false);
    expect(saveGeminiKey('has spaces in it but is long enough to pass length').ok).toBe(false);
  });
});
