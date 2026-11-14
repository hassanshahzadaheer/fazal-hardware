import * as crypto from 'crypto';
import { LicenseStatus } from '../../shared/types';

export interface LicensePayload {
  licenseId: string;
  clientName: string;
  issuedAt: string;
  expiresAt: string;
}

interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

// Signs/verifies over a fixed key order so the same payload object always
// produces the same bytes regardless of property insertion order — the
// signer (scripts/issue-license.js) and verifier must agree on this exactly.
export function canonicalizePayload(payload: LicensePayload): string {
  return JSON.stringify(payload, ['licenseId', 'clientName', 'issuedAt', 'expiresAt']);
}

// Ed25519 (algorithm `null` — it has a built-in hash, per Node's crypto docs)
// so the public key embedded in the shipped app can only ever verify
// licenses, never mint new ones — minting requires the private key, which
// never leaves the vendor's machine.
export function verifyLicensePayload(
  payload: LicensePayload,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalizePayload(payload), 'utf8'),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch {
    return false;
  }
}

export function evaluateLicenseFile(
  raw: string,
  publicKeyPem: string,
  now: Date = new Date()
): LicenseStatus {
  let file: LicenseFile;
  try {
    file = JSON.parse(raw);
  } catch {
    return { state: 'invalid' };
  }

  const payload = file?.payload;
  if (!payload?.clientName || !payload?.expiresAt || typeof file?.signature !== 'string') {
    return { state: 'invalid' };
  }

  if (!verifyLicensePayload(payload, file.signature, publicKeyPem)) {
    return { state: 'invalid' };
  }

  const expiresAt = new Date(payload.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return { state: 'invalid' };
  }

  if (expiresAt.getTime() <= now.getTime()) {
    return { state: 'expired', clientName: payload.clientName, expiresAt: payload.expiresAt };
  }

  return { state: 'valid', clientName: payload.clientName, expiresAt: payload.expiresAt };
}
