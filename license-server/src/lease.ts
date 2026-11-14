import * as crypto from 'crypto';

// MUST stay byte-identical with electron/license/lease.ts (canonical field order).
// test/integration.test.ts runs the real desktop verifier against this signer.
export interface LeasePayload {
  v: 1;
  licenseId: string;
  customerName: string;
  deviceId: string;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  expiresAt: string | null;
  issuedAt: string;
  graceDays: number;
  recheckHours: number;
  nonce: string;
}

const FIELD_ORDER = ['v', 'licenseId', 'customerName', 'deviceId', 'status', 'expiresAt', 'issuedAt', 'graceDays', 'recheckHours', 'nonce'];

export function signLease(payload: LeasePayload, privateKeyPem: string) {
  const canonical = JSON.stringify(payload, FIELD_ORDER);
  const signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKeyPem).toString('base64');
  return { payload, signature };
}
