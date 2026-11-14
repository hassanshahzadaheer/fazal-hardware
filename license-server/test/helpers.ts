import * as crypto from 'crypto';
import { Config } from '../src/config';
import { buildApp } from '../src/app';
import { openDb } from '../src/db';
import { hashPassword, newTotpSecret, totpAt } from '../src/crypto';

export const keys = crypto.generateKeyPairSync('ed25519');
export const privatePem = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
export const publicPem = keys.publicKey.export({ type: 'spki', format: 'pem' }) as string;

export function testConfig(over: Partial<Config> = {}): Config {
  return {
    port: 0, host: '127.0.0.1', dataDir: '', dbPath: ':memory:', backupDir: '', backupKeep: 3,
    signingKeyPem: privatePem, keyPepper: 'test-pepper-test-pepper-test-pepper',
    apiEnabled: true, adminEnabled: true, secureCookies: false, trustProxy: false,
    defaultGraceDays: 7, defaultRecheckHours: 6, ...over,
  };
}

// Fastify's built-in `inject` pulls an ESM-only dependency that older Node 22.x
// patch releases can't require(); drive the app over a real loopback socket
// instead — slightly slower, but it also exercises the real HTTP stack.
export function makeServer(over: Partial<Config> = {}) {
  const config = testConfig(over);
  const db = openDb(':memory:');
  const built = buildApp(config, db);
  let base: string | null = null;
  (built.app as any).inject = async (opts: any) => {
    if (!base) {
      await built.app.listen({ port: 0, host: '127.0.0.1' });
      base = `http://127.0.0.1:${(built.app.server.address() as any).port}`;
    }
    const res = await fetch(base + (opts.url as string), {
      method: opts.method ?? 'GET',
      headers: opts.headers,
      body: opts.payload === undefined ? undefined : typeof opts.payload === 'string' ? opts.payload : JSON.stringify(opts.payload),
      redirect: 'manual',
    });
    const text = await res.text();
    const headers: Record<string, any> = Object.fromEntries(res.headers.entries());
    const cookies = res.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies.length === 1 ? cookies[0] : cookies;
    return { statusCode: res.status, headers, body: text, json: () => JSON.parse(text) };
  };
  return { ...built, config };
}

export const deviceA = 'a'.repeat(64);
export const deviceB = 'b'.repeat(64);
export const nonce = () => crypto.randomBytes(16).toString('hex');

export function addAdmin(db: any, username = 'owner', password = 'correct horse battery staple') {
  const secret = newTotpSecret();
  db.prepare('INSERT INTO admins (username, password_hash, totp_secret, created_at) VALUES (?,?,?,?)')
    .run(username, hashPassword(password), secret, new Date().toISOString());
  return { username, password, secret, code: (offsetSteps = 0) => totpAt(secret, Math.floor(Date.now() / 30000) + offsetSteps) };
}
