// Runs the REAL desktop-app licence client (electron/license/service.ts + lease.ts)
// against the REAL server, over a real HTTP socket — proving signer/verifier agree
// and the offline-grace / restriction behaviour end to end.
import { describe, it, expect, afterEach } from 'vitest';
import { LicenseService, LicenseStorage } from '../../electron/license/service';
import { SignedLease } from '../../electron/license/lease';
import { makeServer, publicPem, deviceA, deviceB } from './helpers';

function memStorage(): LicenseStorage & { lease: SignedLease | null; key: string | null; hw: number } {
  const s: any = {
    lease: null, key: null, hw: 0,
    readLease: () => s.lease, writeLease: (l: SignedLease) => { s.lease = l; },
    readHighWaterMs: () => s.hw, writeHighWaterMs: (ms: number) => { s.hw = ms; },
    getKey: () => s.key, setKey: (k: string) => { s.key = k; }, clearKey: () => { s.key = null; s.lease = null; },
  };
  return s;
}

let close: (() => Promise<void>) | undefined;
afterEach(async () => { await close?.(); close = undefined; });

async function boot(over = {}) {
  const server = makeServer(over);
  await server.app.listen({ port: 0, host: '127.0.0.1' });
  close = () => server.app.close();
  const url = `http://127.0.0.1:${(server.app.server.address() as any).port}`;
  const client = (deviceId = deviceA, storage = memStorage(), now = () => new Date(), fetchImpl?: typeof fetch) =>
    ({ storage, svc: new LicenseService({ serverUrl: url, publicKeyPem: publicPem, deviceId, deviceName: 'PC', appVersion: '1.1.0',
      storage, allowInsecureLocalhost: true, now, fetchImpl }) });
  return { ...server, client };
}
const terms = { customerName: 'Fazal Hardware', maxDevices: 1, offlineGraceDays: 7, recheckHours: 6 };
const DAY = 86_400_000;

describe('desktop client ⇄ licence server', () => {
  it('activates online and reports an active licence with a 7-day offline window', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    const { svc } = client();
    expect(svc.getStatus().state).toBe('unactivated');
    const res = await svc.activate(key.toLowerCase());
    expect(res.ok).toBe(true);
    const st = svc.getStatus();
    expect(st).toMatchObject({ state: 'active', customerName: 'Fazal Hardware', graceDays: 7, recheckDue: false });
  });

  it('keeps working offline for the grace period, then restricts; going online restores it', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    let clock = Date.now();
    const { svc } = client(deviceA, memStorage(), () => new Date(clock));
    await svc.activate(key);

    clock += 6 * DAY; // offline for 6 days: still fully working, recheck is due
    expect(svc.getStatus()).toMatchObject({ state: 'active', recheckDue: true });
    clock += 2 * DAY; // 8 days: grace over
    expect(svc.getStatus()).toMatchObject({ state: 'restricted', reason: 'grace_expired' });
    // Real clock is "now"; the server signs with real time, so simulate coming back online at real time:
    clock = Date.now();
    const back = await svc.refresh();
    expect(back.ok && back.data.state).toBe('active');
  });

  it('suspension is NOT seen offline, but is enforced at the next successful check', async () => {
    const { store, client } = await boot();
    const { license, key } = store.create(terms, 't');
    const { svc } = client();
    await svc.activate(key);
    store.setStatus(license.id, 'suspended', 't');
    expect(svc.getStatus().state).toBe('active'); // no network yet => documented limitation
    const r = await svc.refresh();
    expect(r.ok && r.data).toMatchObject({ state: 'restricted', reason: 'suspended' });
    store.setStatus(license.id, 'active', 't');
    expect((await svc.refresh()).ok).toBe(true);
    expect(svc.getStatus().state).toBe('active');
  });

  it('a failed/offline check leaves the existing lease untouched and surfaces the error', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    const down = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    const storage = memStorage();
    const online = client(deviceA, storage);
    await online.svc.activate(key);
    const before = JSON.stringify(storage.lease);
    const offline = client(deviceA, storage, undefined, down).svc;
    const r = await offline.refresh();
    expect(r.ok).toBe(false);
    expect(JSON.stringify(storage.lease)).toBe(before);
    expect(offline.getStatus()).toMatchObject({ state: 'active', lastCheckError: expect.any(String) });
  });

  it('enforces the device limit from the client side', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    expect((await client(deviceA).svc.activate(key)).ok).toBe(true);
    const second = await client(deviceB).svc.activate(key);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe('DEVICE_LIMIT');
  });

  it('rejects a forged server reply (wrong signing key) without changing local state', async () => {
    const { store, client, app } = await boot();
    const { key } = store.create(terms, 't');
    // Client trusts a different public key than the one the server signs with => forged.
    const other = (await import('crypto')).generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const storage = memStorage();
    const addr = `http://127.0.0.1:${(app.server.address() as any).port}`;
    const svc = new LicenseService({ serverUrl: addr, publicKeyPem: other, deviceId: deviceA, deviceName: 'PC', appVersion: '1', storage, allowInsecureLocalhost: true });
    const r = await svc.activate(key);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('BAD_SIGNATURE');
    expect(storage.lease).toBeNull();
    expect(storage.key).toBeNull();
    void client;
  });

  it('rejects a replayed lease (nonce mismatch)', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    const first = client();
    await first.svc.activate(key);
    const recorded = JSON.stringify({ ok: true, lease: first.storage.lease });
    const replay = (async () => new Response(recorded, { status: 200 })) as unknown as typeof fetch;
    const victim = client(deviceA, memStorage(), undefined, replay);
    const r = await victim.svc.activate(key);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('BAD_SIGNATURE');
  });

  it('detects clock rollback via the high-water mark', async () => {
    const { store, client } = await boot();
    const { key } = store.create(terms, 't');
    const storage = memStorage();
    let clock = Date.now();
    const { svc } = client(deviceA, storage, () => new Date(clock));
    await svc.activate(key);
    clock += 3 * DAY;
    expect(svc.getStatus().state).toBe('active'); // ratchets high-water to +3d
    clock -= 3 * DAY; // user winds clock back
    expect(svc.getStatus()).toMatchObject({ state: 'restricted', reason: 'clock_tampered' });
  });

  it('refuses a non-HTTPS server URL when insecure localhost is not allowed (packaged build)', async () => {
    const { store, app } = await boot();
    const { key } = store.create(terms, 't');
    const addr = `http://127.0.0.1:${(app.server.address() as any).port}`;
    const svc = new LicenseService({ serverUrl: addr, publicKeyPem: publicPem, deviceId: deviceA, deviceName: 'PC', appVersion: '1', storage: memStorage() });
    const r = await svc.activate(key);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('BAD_SERVER_URL');
  });
});
