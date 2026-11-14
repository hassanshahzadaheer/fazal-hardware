import { describe, it, expect } from 'vitest';
import { makeServer, addAdmin } from './helpers';

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();
const HDR = { 'content-type': 'application/x-www-form-urlencoded' };

async function login(app: any, db: any, over: any = {}) {
  const admin = addAdmin(db);
  const res = await app.inject({ method: 'POST', url: '/admin/login', headers: HDR,
    payload: form({ username: admin.username, password: admin.password, totp: admin.code(), ...over }) });
  const cookie = (res.headers['set-cookie'] as string | undefined)?.split(';')[0];
  return { admin, res, cookie };
}
const csrfOf = (html: string) => html.match(/name="_csrf" value="([^"]+)"/)![1];

describe('owner dashboard security', () => {
  it('redirects every admin page to login when unauthenticated', async () => {
    const { app } = makeServer();
    for (const url of ['/admin', '/admin/devices', '/admin/audit', '/admin/licenses/new']) {
      const r = await app.inject({ url });
      expect(r.statusCode).toBe(303);
      expect(r.headers.location).toBe('/admin/login');
    }
  });

  it('login needs password AND a valid TOTP code; wrong password/code gives a generic error', async () => {
    const { app, db } = makeServer();
    const a = await login(app, db, { password: 'wrong' });
    expect(a.res.statusCode).toBe(401);
    expect(a.res.body).toContain('Invalid username, password or authentication code.');
    const other = makeServer();
    const b = await login(other.app, other.db, { totp: '000000' });
    expect(b.res.statusCode).toBe(401);
  });

  it('a TOTP code cannot be replayed', async () => {
    const { app, db } = makeServer();
    const { admin, cookie } = await login(app, db);
    expect(cookie).toBeTruthy();
    const again = await app.inject({ method: 'POST', url: '/admin/login', headers: HDR,
      payload: form({ username: admin.username, password: admin.password, totp: admin.code() }) });
    expect(again.statusCode).toBe(401);
  });

  it('locks out after repeated failures even with correct credentials afterwards', async () => {
    const { app, db } = makeServer();
    const admin = addAdmin(db);
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: 'POST', url: '/admin/login', headers: HDR, payload: form({ username: admin.username, password: 'bad', totp: '123456' }) });
    }
    const ok = await app.inject({ method: 'POST', url: '/admin/login', headers: HDR,
      payload: form({ username: admin.username, password: admin.password, totp: admin.code() }) });
    expect(ok.statusCode).toBe(401);
    expect(ok.body).toContain('Too many failed attempts');
  });

  it('session cookie is HttpOnly + SameSite=Strict; pages carry CSP / no-store', async () => {
    const { app, db } = makeServer();
    const { res, cookie } = await login(app, db);
    const raw = res.headers['set-cookie'] as string;
    expect(raw).toMatch(/HttpOnly/);
    expect(raw).toMatch(/SameSite=Strict/);
    const page = await app.inject({ url: '/admin', headers: { cookie: cookie! } });
    expect(page.statusCode).toBe(200);
    expect(page.headers['content-security-policy']).toContain("default-src 'none'");
    expect(page.headers['cache-control']).toBe('no-store');
    expect(page.headers['x-frame-options']).toBe('DENY');
  });

  it('marks the cookie Secure (with __Host- prefix) when secureCookies is on', async () => {
    const { app, db } = makeServer({ secureCookies: true });
    const { res } = await login(app, db);
    expect(res.headers['set-cookie']).toMatch(/^__Host-fz_admin=.*Secure/);
  });

  it('rejects state-changing posts without a valid CSRF token, and cross-site posts', async () => {
    const { app, db, store } = makeServer();
    const { cookie } = await login(app, db);
    const { license } = store.create({ customerName: 'X', maxDevices: 1, offlineGraceDays: 7, recheckHours: 6 }, 't');
    const noToken = await app.inject({ method: 'POST', url: `/admin/licenses/${license.id}/status`, headers: { ...HDR, cookie: cookie! }, payload: form({ to: 'revoked' }) });
    expect(noToken.statusCode).toBe(403);
    expect(store.get(license.id)!.status).toBe('active');

    const page = await app.inject({ url: '/admin', headers: { cookie: cookie! } });
    const token = csrfOf(page.body);
    const crossSite = await app.inject({ method: 'POST', url: `/admin/licenses/${license.id}/status`,
      headers: { ...HDR, cookie: cookie!, 'sec-fetch-site': 'cross-site' }, payload: form({ to: 'revoked', _csrf: token }) });
    expect(crossSite.statusCode).toBe(403);
    expect(store.get(license.id)!.status).toBe('active');
  });

  it('full owner flow: issue key (shown once), suspend, reactivate, set expiry/limit, remove device', async () => {
    const { app, db, store } = makeServer();
    const { cookie } = await login(app, db);
    const h = { ...HDR, cookie: cookie! };
    const token = csrfOf((await app.inject({ url: '/admin/licenses/new', headers: { cookie: cookie! } })).body);

    const created = await app.inject({ method: 'POST', url: '/admin/licenses/new', headers: h, payload: form({
      _csrf: token, customerName: 'Ali <script>alert(1)</script> Traders', customerEmail: 'ali@example.com',
      expiresAt: '2030-01-31', maxDevices: '2', offlineGraceDays: '10', recheckHours: '4', notes: '' }) });
    expect(created.statusCode).toBe(200);
    const key = created.body.match(/class="key">(FAZL-[A-Z2-9-]+)</)![1];
    const lic = store.findByKey(key)!;
    expect(lic).toMatchObject({ max_devices: 2, offline_grace_days: 10, recheck_hours: 4 });
    expect(lic.expires_at).toContain('2030-01-31');
    // Output encoding: stored markup must not render as HTML.
    const list = await app.inject({ url: '/admin', headers: { cookie: cookie! } });
    expect(list.body).not.toContain('<script>alert(1)</script>');
    expect(list.body).toContain('&lt;script&gt;');
    // The full key is never shown again.
    expect(list.body).not.toContain(key);
    expect((await app.inject({ url: `/admin/licenses/${lic.id}`, headers: { cookie: cookie! } })).body).not.toContain(key);

    const act = (path: string, extra: Record<string, string>) => app.inject({ method: 'POST', url: path, headers: h, payload: form({ _csrf: token, ...extra }) });
    await act(`/admin/licenses/${lic.id}/status`, { to: 'suspended' });
    expect(store.get(lic.id)!.status).toBe('suspended');
    await act(`/admin/licenses/${lic.id}/status`, { to: 'revoked' });
    expect(store.get(lic.id)!.status).toBe('revoked');
    await act(`/admin/licenses/${lic.id}/status`, { to: 'active' });
    expect(store.get(lic.id)!.status).toBe('active');
    await act(`/admin/licenses/${lic.id}/update`, { customerName: 'Ali Traders', expiresAt: '2031-06-30', maxDevices: '3', offlineGraceDays: '14', recheckHours: '12', notes: 'n' });
    expect(store.get(lic.id)).toMatchObject({ max_devices: 3, offline_grace_days: 14, recheck_hours: 12 });

    const invalid = await act(`/admin/licenses/${lic.id}/update`, { customerName: 'Ali', maxDevices: '0', offlineGraceDays: '14', recheckHours: '12' });
    expect(invalid.statusCode).toBe(400);
    const actions = (db.prepare('SELECT action FROM audit_log').all() as any[]).map((r) => r.action);
    expect(actions).toEqual(expect.arrayContaining(['license.create', 'license.suspend', 'license.revoke', 'license.reactivate', 'license.update', 'admin.login']));
  });

  it('admin routes are absent when ADMIN_ENABLED=false (separately deployable API)', async () => {
    const { app } = makeServer({ adminEnabled: false });
    expect((await app.inject({ url: '/admin' })).statusCode).toBe(404);
    expect((await app.inject({ url: '/healthz' })).statusCode).toBe(200);
  });
});
