import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveReleaseConfig } = require('../release-config');

const pem = (crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string);
const rsa = (crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' }) as string);
const good = { FAZAL_RELEASE: '1', LICENSE_SERVER_URL: 'https://license.myshop.pk', LICENSE_PUBLIC_KEY_PEM: pem };

describe('release build config guard', () => {
  it('accepts a real https URL + Ed25519 public key (PEM or base64)', () => {
    expect(resolveReleaseConfig(good).release).toBe(true);
    const b64 = { ...good, LICENSE_PUBLIC_KEY_PEM: '', LICENSE_PUBLIC_KEY_B64: Buffer.from(pem).toString('base64') };
    expect(resolveReleaseConfig(b64).publicKeyPem.trim()).toBe(pem.trim());
  });

  it.each([
    'http://license.myshop.pk', 'https://localhost:8787', 'https://127.0.0.1', 'https://license.example.com',
    'https://foo.test', 'https://192.168.1.5', '', 'not a url',
  ])('refuses release with server URL %j', (url) => {
    expect(() => resolveReleaseConfig({ ...good, LICENSE_SERVER_URL: url })).toThrow(/Refusing to build a RELEASE/);
  });

  it('refuses release with a missing, placeholder or non-Ed25519 key', () => {
    expect(() => resolveReleaseConfig({ ...good, LICENSE_PUBLIC_KEY_PEM: '' })).toThrow();
    expect(() => resolveReleaseConfig({ ...good, LICENSE_PUBLIC_KEY_PEM: 'REPLACE_WITH_REAL_PUBLIC_KEY' })).toThrow();
    expect(() => resolveReleaseConfig({ ...good, LICENSE_PUBLIC_KEY_PEM: rsa })).toThrow(/Ed25519/);
  });

  it('dev builds are allowed without any config', () => {
    expect(resolveReleaseConfig({})).toMatchObject({ release: false, serverUrl: '' });
  });
});
