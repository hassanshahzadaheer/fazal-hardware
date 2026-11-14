import * as crypto from 'crypto';

// ---- activation keys -------------------------------------------------------
// FAZL-XXXX-XXXX-XXXX-XXXX, 16 chars from a 32-char alphabet (no I/O/0/1) = 80 bits.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationKey(): string {
  const bytes = crypto.randomBytes(16);
  let chars = '';
  for (const b of bytes) chars += ALPHABET[b % 32]; // 256 % 32 === 0 -> no modulo bias
  return 'FAZL-' + [0, 4, 8, 12].map((i) => chars.slice(i, i + 4)).join('-');
}

export function normalizeKey(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isKeyFormat(key: string): boolean {
  return /^FAZL(-[A-Z2-9]{4}){4}$/.test(key);
}

// Keys are stored only as keyed hashes: a leaked database cannot reveal them.
export function hashKey(key: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(key).digest('hex');
}

// ---- admin passwords (scrypt) ---------------------------------------------
const N = 16384, R = 8, P = 1, LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const DUMMY = hashPassword('dummy-password-for-timing');

export function verifyPassword(password: string, stored: string | null): boolean {
  // Always burn a scrypt computation, even for unknown users, so response time
  // doesn't reveal whether a username exists.
  const parts = (stored ?? DUMMY).split('$');
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: +n, r: +r, p: +p });
  return crypto.timingSafeEqual(actual, expected) && stored !== null;
}

// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) --------------------------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function b32decode(s: string): Buffer {
  let bits = '';
  for (const c of s.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

export function totpAt(secret: string, step: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const code = (h.readUInt32BE(o) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, '0');
}

/** Returns the matched time-step (so callers can reject replays) or null. */
export function verifyTotp(secret: string, code: string, nowMs: number = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(nowMs / 30_000);
  for (const s of [step - 1, step, step + 1]) {
    const expected = Buffer.from(totpAt(secret, s));
    if (crypto.timingSafeEqual(expected, Buffer.from(code))) return s;
  }
  return null;
}

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
