import * as crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import { canonicalizePayload, evaluateLicenseFile, LicensePayload } from '../verify';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const OTHER_PUBLIC_PEM = crypto
  .generateKeyPairSync('ed25519')
  .publicKey.export({ type: 'spki', format: 'pem' })
  .toString();

function sign(payload: LicensePayload): string {
  return crypto.sign(null, Buffer.from(canonicalizePayload(payload), 'utf8'), privateKey).toString('base64');
}

function makeFile(payload: LicensePayload) {
  return JSON.stringify({ payload, signature: sign(payload) });
}

describe('license verify (§27) — signed license file evaluation', () => {
  it('accepts a validly signed, unexpired license', () => {
    const payload: LicensePayload = {
      licenseId: 'lic-1',
      clientName: 'Fazal Hardware',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const status = evaluateLicenseFile(makeFile(payload), PUBLIC_PEM);
    expect(status).toEqual({ state: 'valid', clientName: 'Fazal Hardware', expiresAt: payload.expiresAt });
  });

  it('reports expired for a validly signed license past its expiry date', () => {
    const payload: LicensePayload = {
      licenseId: 'lic-2',
      clientName: 'Fazal Hardware',
      issuedAt: '2020-01-01T00:00:00.000Z',
      expiresAt: '2020-02-01T00:00:00.000Z',
    };
    const status = evaluateLicenseFile(makeFile(payload), PUBLIC_PEM);
    expect(status).toEqual({ state: 'expired', clientName: 'Fazal Hardware', expiresAt: payload.expiresAt });
  });

  it('rejects a license whose payload was tampered with after signing', () => {
    const payload: LicensePayload = {
      licenseId: 'lic-3',
      clientName: 'Fazal Hardware',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const signature = sign(payload);
    const tampered = { ...payload, expiresAt: '2199-01-01T00:00:00.000Z' };
    const status = evaluateLicenseFile(JSON.stringify({ payload: tampered, signature }), PUBLIC_PEM);
    expect(status).toEqual({ state: 'invalid' });
  });

  it('rejects a license signed with a different (untrusted) private key', () => {
    const payload: LicensePayload = {
      licenseId: 'lic-4',
      clientName: 'Fazal Hardware',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    const status = evaluateLicenseFile(makeFile(payload), OTHER_PUBLIC_PEM);
    expect(status).toEqual({ state: 'invalid' });
  });

  it('rejects malformed JSON', () => {
    expect(evaluateLicenseFile('not json', PUBLIC_PEM)).toEqual({ state: 'invalid' });
  });

  it('rejects a file missing required fields', () => {
    expect(evaluateLicenseFile(JSON.stringify({ payload: {} }), PUBLIC_PEM)).toEqual({ state: 'invalid' });
  });
});
