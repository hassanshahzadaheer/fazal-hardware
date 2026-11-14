import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { evaluateLease, LeasePayload, canonicalizeLease, SignedLease } from '../lease';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pub = publicKey.export({ type: 'spki', format: 'pem' }) as string;
const DAY = 86_400_000;
const T0 = Date.parse('2026-11-01T00:00:00Z');

function lease(over: Partial<LeasePayload> = {}, key = privateKey): SignedLease {
  const payload: LeasePayload = {
    v: 1, licenseId: 'L1', customerName: 'Shop', deviceId: 'dev', status: 'active', expiresAt: null,
    issuedAt: new Date(T0).toISOString(), graceDays: 7, recheckHours: 6, nonce: 'n', ...over,
  };
  return { payload, signature: crypto.sign(null, Buffer.from(canonicalizeLease(payload)), key).toString('base64') };
}
const at = (ms: number) => new Date(T0 + ms);

describe('evaluateLease', () => {
  it('no lease -> unactivated', () => {
    expect(evaluateLease(null, pub, 'dev', at(0), 0)).toEqual({ state: 'unactivated' });
  });

  it('active within the grace window, with recheck due only after the interval', () => {
    expect(evaluateLease(lease(), pub, 'dev', at(1000), 0)).toMatchObject({ state: 'active', recheckDue: false });
    expect(evaluateLease(lease(), pub, 'dev', at(7 * 3_600_000), 0)).toMatchObject({ state: 'active', recheckDue: true });
  });

  it('grace boundary: still active just before 7 days, restricted at exactly 7 days', () => {
    expect(evaluateLease(lease(), pub, 'dev', at(7 * DAY - 1), 0).state).toBe('active');
    expect(evaluateLease(lease(), pub, 'dev', at(7 * DAY), 0)).toMatchObject({ state: 'restricted', reason: 'grace_expired' });
  });

  it('grace period is configurable per lease', () => {
    expect(evaluateLease(lease({ graceDays: 30 }), pub, 'dev', at(20 * DAY), 0).state).toBe('active');
    expect(evaluateLease(lease({ graceDays: 0 }), pub, 'dev', at(1), 0)).toMatchObject({ reason: 'grace_expired' });
  });

  it('licence expiry wins even inside the grace window', () => {
    const l = lease({ expiresAt: new Date(T0 + 2 * DAY).toISOString() });
    expect(evaluateLease(l, pub, 'dev', at(1 * DAY), 0).state).toBe('active');
    expect(evaluateLease(l, pub, 'dev', at(3 * DAY), 0)).toMatchObject({ state: 'restricted', reason: 'expired' });
  });

  it.each(['suspended', 'revoked', 'expired'] as const)('server status %s -> restricted', (status) => {
    expect(evaluateLease(lease({ status }), pub, 'dev', at(1000), 0)).toMatchObject({ state: 'restricted', reason: status });
  });

  it('rejects tampered payloads, foreign signing keys and other devices', () => {
    const l = lease();
    l.payload.graceDays = 3650; // attacker extends grace locally
    expect(evaluateLease(l, pub, 'dev', at(1000), 0)).toMatchObject({ reason: 'invalid' });
    const foreign = crypto.generateKeyPairSync('ed25519').privateKey;
    expect(evaluateLease(lease({}, foreign), pub, 'dev', at(1000), 0)).toMatchObject({ reason: 'invalid' });
    expect(evaluateLease(lease(), pub, 'other-device', at(1000), 0)).toMatchObject({ reason: 'invalid' });
    expect(evaluateLease({ payload: { v: 2 } as any, signature: 'x' }, pub, 'dev', at(0), 0)).toMatchObject({ reason: 'invalid' });
  });

  it('clock rollback beyond tolerance is flagged; small corrections are tolerated', () => {
    const highWater = T0 + 3 * DAY;
    expect(evaluateLease(lease(), pub, 'dev', new Date(highWater - 30 * 60_000), highWater).state).toBe('active');
    expect(evaluateLease(lease(), pub, 'dev', new Date(highWater - 2 * 3_600_000), highWater)).toMatchObject({ reason: 'clock_tampered' });
  });
});
