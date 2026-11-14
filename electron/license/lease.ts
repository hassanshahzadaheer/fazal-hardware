import * as crypto from 'crypto';
import { LicenseStatus } from '../../shared/types';

// A "lease" is what the licence server returns: a small statement, signed with
// an Ed25519 key only the server holds, saying "this device may run this
// licence until X". The app ships only the PUBLIC key, so it can verify leases
// but never mint them. This file is pure (no Electron/fs) so it is unit-testable.

export type LeaseStatusValue = 'active' | 'suspended' | 'revoked' | 'expired';

export interface LeasePayload {
  v: 1;
  licenseId: string;
  customerName: string;
  deviceId: string;
  status: LeaseStatusValue;
  /** Licence expiry; null = never expires. */
  expiresAt: string | null;
  /** Server clock at signing time == time of the last successful online check. */
  issuedAt: string;
  /** How long the device may keep working offline after issuedAt. */
  graceDays: number;
  /** How often the app should try to re-validate while online. */
  recheckHours: number;
  /** Echo of the client's request nonce; binds a response to one request (anti-replay). */
  nonce: string;
}

export interface SignedLease {
  payload: LeasePayload;
  signature: string; // base64 Ed25519
}

// Fixed key order => identical bytes on signer (server) and verifier (app).
const FIELD_ORDER = [
  'v', 'licenseId', 'customerName', 'deviceId', 'status',
  'expiresAt', 'issuedAt', 'graceDays', 'recheckHours', 'nonce',
] as const;

export function canonicalizeLease(payload: LeasePayload): string {
  return JSON.stringify(payload, FIELD_ORDER as unknown as string[]);
}

export function verifyLease(lease: SignedLease, publicKeyPem: string): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalizeLease(lease.payload), 'utf8'),
      publicKeyPem,
      Buffer.from(lease.signature, 'base64')
    );
  } catch {
    return false;
  }
}

export function isWellFormedLease(x: unknown): x is SignedLease {
  const l = x as SignedLease;
  const p = l?.payload;
  return (
    typeof l?.signature === 'string' &&
    !!p &&
    p.v === 1 &&
    typeof p.licenseId === 'string' &&
    typeof p.customerName === 'string' &&
    typeof p.deviceId === 'string' &&
    ['active', 'suspended', 'revoked', 'expired'].includes(p.status) &&
    (p.expiresAt === null || typeof p.expiresAt === 'string') &&
    typeof p.issuedAt === 'string' &&
    Number.isFinite(Date.parse(p.issuedAt)) &&
    Number.isFinite(p.graceDays) && p.graceDays >= 0 &&
    Number.isFinite(p.recheckHours) && p.recheckHours > 0 &&
    typeof p.nonce === 'string'
  );
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Wall-clock going backwards by more than this vs. the latest time we've seen
// is treated as tampering (small NTP/DST corrections are tolerated).
const CLOCK_ROLLBACK_TOLERANCE_MS = 1 * HOUR;
// Local clock this far BEHIND the server's issuedAt is flagged; a modest skew is normal.
const SERVER_SKEW_TOLERANCE_MS = 1 * DAY;

export function evaluateLease(
  lease: SignedLease | null,
  publicKeyPem: string,
  deviceId: string,
  now: Date,
  highWaterMs: number
): LicenseStatus {
  if (!lease) return { state: 'unactivated' };

  if (!isWellFormedLease(lease) || !verifyLease(lease, publicKeyPem) || lease.payload.deviceId !== deviceId) {
    return { state: 'restricted', reason: 'invalid' };
  }
  const p = lease.payload;
  const nowMs = now.getTime();
  const issuedMs = Date.parse(p.issuedAt);
  const base = { customerName: p.customerName, expiresAt: p.expiresAt, lastCheckedAt: p.issuedAt };

  if (nowMs < highWaterMs - CLOCK_ROLLBACK_TOLERANCE_MS || nowMs < issuedMs - SERVER_SKEW_TOLERANCE_MS) {
    return { state: 'restricted', reason: 'clock_tampered', ...base };
  }
  if (p.status !== 'active') {
    return { state: 'restricted', reason: p.status, ...base };
  }
  if (p.expiresAt && nowMs >= Date.parse(p.expiresAt)) {
    return { state: 'restricted', reason: 'expired', ...base };
  }
  const graceEndsMs = issuedMs + p.graceDays * DAY;
  if (nowMs >= graceEndsMs) {
    return { state: 'restricted', reason: 'grace_expired', ...base };
  }
  return {
    state: 'active',
    customerName: p.customerName,
    expiresAt: p.expiresAt,
    lastCheckedAt: p.issuedAt,
    graceEndsAt: new Date(graceEndsMs).toISOString(),
    graceDays: p.graceDays,
    recheckDue: nowMs >= issuedMs + p.recheckHours * HOUR,
  };
}
