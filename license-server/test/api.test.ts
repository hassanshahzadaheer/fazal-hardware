import { describe, it, expect } from 'vitest';
import { makeServer, deviceA, deviceB, nonce, publicPem } from './helpers';
import * as crypto from 'crypto';

const base = { customerName: 'Fazal Hardware', maxDevices: 1, offlineGraceDays: 7, recheckHours: 6 };
const post = (app: any, action: string, body: any) => app.inject({ method: 'POST', url: `/api/v1/${action}`, headers: { 'content-type': 'application/json' }, payload: body });
const body = (key: string, deviceId = deviceA, n = nonce()) => ({ key, deviceId, deviceName: 'PC', appVersion: '1.1.0', nonce: n });

describe('licence API', () => {
  it('activates with a valid key and returns a lease signed by the server key', async () => {
    const { app, store } = makeServer();
    const { key } = store.create(base, 'test');
    const n = nonce();
    const res = await post(app, 'activate', body(key, deviceA, n));
    expect(res.statusCode).toBe(200);
    const { lease } = res.json();
    expect(lease.payload).toMatchObject({ status: 'active', deviceId: deviceA, nonce: n, graceDays: 7, customerName: 'Fazal Hardware' });
    const canonical = JSON.stringify(lease.payload, ['v','licenseId','customerName','deviceId','status','expiresAt','issuedAt','graceDays','recheckHours','nonce']);
    expect(crypto.verify(null, Buffer.from(canonical), publicPem, Buffer.from(lease.signature, 'base64'))).toBe(true);
  });

  it('stores only a keyed hash of the key, never the key itself', async () => {
    const { store, db } = makeServer();
    const { key } = store.create(base, 'test');
    const dump = JSON.stringify(db.prepare('SELECT * FROM licenses').all());
    expect(dump).not.toContain(key);
    expect(dump).not.toContain(key.slice(5, 9) + '-' + key.slice(10, 14));
  });

  it('rejects unknown keys (404, unsigned) and malformed requests (400)', async () => {
    const { app } = makeServer();
    expect((await post(app, 'activate', body('FAZL-AAAA-BBBB-CCCC-DDDD'))).statusCode).toBe(404);
    expect((await post(app, 'activate', { key: 'nope' })).statusCode).toBe(400);
  });

  it('enforces the device limit but lets the same device re-activate', async () => {
    const { app, store } = makeServer();
    const { key } = store.create(base, 'test');
    expect((await post(app, 'activate', body(key, deviceA))).statusCode).toBe(200);
    expect((await post(app, 'activate', body(key, deviceA))).statusCode).toBe(200);
    const second = await post(app, 'activate', body(key, deviceB));
    expect(second.statusCode).toBe(409);
    expect(second.json().code).toBe('DEVICE_LIMIT');
  });

  it('suspend/revoke yield signed restricted leases; reactivate restores', async () => {
    const { app, store } = makeServer();
    const { license, key } = store.create(base, 'test');
    await post(app, 'activate', body(key));
    store.setStatus(license.id, 'suspended', 'test');
    expect((await post(app, 'validate', body(key))).json().lease.payload.status).toBe('suspended');
    store.setStatus(license.id, 'revoked', 'test');
    expect((await post(app, 'validate', body(key))).json().lease.payload.status).toBe('revoked');
    store.setStatus(license.id, 'active', 'test');
    expect((await post(app, 'validate', body(key))).json().lease.payload.status).toBe('active');
  });

  it('reports expiry from the server clock and honours extended expiry', async () => {
    const { app, store } = makeServer();
    const { license, key } = store.create({ ...base, expiresAt: new Date(Date.now() - 1000).toISOString() }, 'test');
    expect((await post(app, 'activate', body(key))).json().lease.payload.status).toBe('expired');
    store.update(license.id, { ...base, expiresAt: new Date(Date.now() + 86400_000).toISOString() }, 'test');
    expect((await post(app, 'activate', body(key))).json().lease.payload.status).toBe('active');
  });

  it('a device removed by the owner is told so on validate, and is not silently re-added', async () => {
    const { app, store } = makeServer();
    const { license, key } = store.create(base, 'test');
    await post(app, 'activate', body(key));
    const act = store.activations(license.id)[0];
    store.removeDevice(license.id, act.id, 'test');
    expect((await post(app, 'validate', body(key))).json().lease.payload.status).toBe('revoked');
    expect(store.activations(license.id)[0].active).toBe(0);
    // ...but it can deliberately re-activate with the key while a seat is free.
    expect((await post(app, 'activate', body(key))).json().lease.payload.status).toBe('active');
  });

  it('rekey invalidates the old key and frees all seats', async () => {
    const { app, store } = makeServer();
    const { license, key } = store.create(base, 'test');
    await post(app, 'activate', body(key));
    const newKey = store.rekey(license.id, 'test');
    expect((await post(app, 'validate', body(key))).statusCode).toBe(404);
    expect((await post(app, 'activate', body(newKey, deviceB))).statusCode).toBe(200);
  });

  it('rate-limits repeated wrong-key guesses', async () => {
    const { app } = makeServer();
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await post(app, 'activate', body('FAZL-AAAA-BBBB-CCCC-DDDD'))).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 404)).toBe(true);
    expect(codes[11]).toBe(429);
  });

  it('writes an audit trail', async () => {
    const { store, db } = makeServer();
    const { license } = store.create(base, 'owner');
    store.setStatus(license.id, 'suspended', 'owner');
    const actions = (db.prepare('SELECT action FROM audit_log').all() as any[]).map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['license.create', 'license.suspend']));
  });
});
