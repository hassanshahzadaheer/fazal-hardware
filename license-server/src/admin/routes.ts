import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Database from 'better-sqlite3';
import { Config } from '../config';
import { LicenseStore, ValidationError, validateInput } from '../licenses';
import { attemptLogin, checkCsrf, createSession, getSession, setSessionCookie, AdminSession } from './auth';
import { CSS, esc, fmtDate, layout } from './html';

export function registerAdmin(app: FastifyInstance, db: Database.Database, store: LicenseStore, config: Config): void {
  const secure = config.secureCookies;

  app.addHook('onSend', async (req, reply) => {
    if (!req.url.startsWith('/admin')) return;
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    if (secure) reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  });

  const html = (reply: FastifyReply, status: number, body: string) => reply.code(status).type('text/html; charset=utf-8').send(body);
  const redirect = (reply: FastifyReply, to: string) => reply.code(303).header('Location', to).send();

  // Reject cross-site form posts even before CSRF-token checking.
  const sameOrigin = (req: FastifyRequest) => {
    const site = req.headers['sec-fetch-site'];
    if (site && site !== 'same-origin' && site !== 'none') return false;
    const origin = req.headers.origin;
    return !origin || origin === 'null' ? !origin : new URL(origin).host === req.headers.host;
  };

  type Handler = (req: FastifyRequest, reply: FastifyReply, session: AdminSession) => unknown;
  const authed = (handler: Handler, opts: { post?: boolean } = {}) => async (req: FastifyRequest, reply: FastifyReply) => {
    const session = getSession(db, req, secure);
    if (!session) return redirect(reply, '/admin/login');
    if (opts.post && (!sameOrigin(req) || !checkCsrf(session, req.body))) {
      return html(reply, 403, layout('Forbidden', '<div class="card"><h1>Request rejected</h1><p>Security check failed. Go back and retry.</p></div>', { nav: true, csrf: session.csrf }));
    }
    return handler(req, reply, session);
  };
  const flashRedirect = (reply: FastifyReply, to: string, msg: string) => redirect(reply, `${to}${to.includes('?') ? '&' : '?'}m=${encodeURIComponent(msg)}`);
  const page = (s: AdminSession, req: FastifyRequest, title: string, body: string) =>
    layout(title, body, { nav: true, csrf: s.csrf, flash: (req.query as any)?.m });

  app.get('/admin/static/style.css', async (_req, reply) => reply.type('text/css').send(CSS));

  // ---- login ----------------------------------------------------------------
  const loginForm = (error = '') => layout('Sign in', `<div class="card login"><h1>Owner sign-in</h1>
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <form method="post" action="/admin/login" autocomplete="off">
      <label>Username<input name="username" required autofocus></label>
      <label>Password<input name="password" type="password" required></label>
      <label>Authenticator code<input name="totp" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label>
      <div class="actions"><button class="primary">Sign in</button></div></form></div>`);

  app.get('/admin/login', async (_req, reply) => html(reply, 200, loginForm()));
  app.post('/admin/login', async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, string>;
    if (!sameOrigin(req)) return html(reply, 403, loginForm('Request rejected.'));
    const r = attemptLogin(db, String(b.username ?? '').slice(0, 100), String(b.password ?? '').slice(0, 500), String(b.totp ?? ''), req.ip);
    if (!r.ok) return html(reply, 401, loginForm(r.message));
    const { token } = createSession(db, r.adminId);
    setSessionCookie(reply, secure, token);
    return redirect(reply, '/admin');
  });
  app.post('/admin/logout', authed(async (_req, reply, s) => {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(s.tokenHash);
    setSessionCookie(reply, secure, null);
    return redirect(reply, '/admin/login');
  }, { post: true }));

  const csrf = (s: AdminSession) => `<input type="hidden" name="_csrf" value="${esc(s.csrf)}">`;
  const badge = (s: string) => `<span class="badge ${esc(s)}">${esc(s)}</span>`;
  const effective = (l: { status: string; expires_at: string | null }) =>
    l.status === 'active' && l.expires_at && Date.parse(l.expires_at) <= Date.now() ? 'expired' : l.status;

  // ---- licences list ----------------------------------------------------------
  app.get('/admin', authed(async (req, reply, s) => {
    const q = req.query as Record<string, string>;
    const rows = store.list(q.q ?? '', q.status ?? '');
    const body = `<h1>Licences</h1>
      <div class="card"><form method="get" class="row"><label>Search<input name="q" value="${esc(q.q)}" placeholder="customer, email, key ending…"></label>
        <label>Status<select name="status"><option value="">All</option>${['active', 'suspended', 'revoked'].map((x) => `<option ${q.status === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <div style="align-self:end"><button>Filter</button> <a class="btn primary" href="/admin/licenses/new">Issue new licence</a></div></form></div>
      <div class="card"><table><tr><th>Customer</th><th>Key</th><th>Status</th><th>Expires</th><th>Devices</th><th>Offline grace</th></tr>
      ${rows.map((l) => `<tr><td><a href="/admin/licenses/${esc(l.id)}">${esc(l.customer_name)}</a><div class="muted">${esc(l.customer_email)}</div></td>
        <td>FAZL-••••-••••-••••-${esc(l.key_hint)}</td><td>${badge(effective(l))}</td><td>${l.expires_at ? fmtDate(l.expires_at) : 'never'}</td>
        <td>${l.device_count} / ${l.max_devices}</td><td>${l.offline_grace_days} d</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No licences yet.</td></tr>'}</table></div>`;
    return html(reply, 200, page(s, req, 'Licences', body));
  }));

  // ---- create -------------------------------------------------------------------
  const licenseForm = (s: AdminSession, v: any, action: string, submit: string, error = '') => `
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <form method="post" action="${action}">${csrf(s)}
      <div class="row"><label>Customer name<input name="customerName" required maxlength="200" value="${esc(v.customerName)}"></label>
      <label>Customer email<input name="customerEmail" type="email" value="${esc(v.customerEmail)}"></label></div>
      <div class="row"><label>Expiry date (blank = never)<input name="expiresAt" type="date" value="${esc(v.expiresAt)}"></label>
      <label>Device limit<input name="maxDevices" type="number" min="1" max="100" required value="${esc(v.maxDevices)}"></label>
      <label>Offline grace (days)<input name="offlineGraceDays" type="number" min="0" max="90" required value="${esc(v.offlineGraceDays)}"></label>
      <label>Recheck every (hours)<input name="recheckHours" type="number" min="1" max="168" required value="${esc(v.recheckHours)}"></label></div>
      <label>Notes (private)<textarea name="notes" rows="3" maxlength="2000">${esc(v.notes)}</textarea></label>
      <div class="actions"><button class="primary">${submit}</button></div></form>`;
  const toInput = (b: any) => ({ ...b, expiresAt: b.expiresAt ? `${b.expiresAt}T23:59:59.000Z` : null });
  const defaults = { maxDevices: 1, offlineGraceDays: config.defaultGraceDays, recheckHours: config.defaultRecheckHours };

  app.get('/admin/licenses/new', authed(async (req, reply, s) =>
    html(reply, 200, page(s, req, 'New licence', `<h1>Issue a licence</h1><div class="card">${licenseForm(s, defaults, '/admin/licenses/new', 'Create licence & generate key')}</div>`))));
  app.post('/admin/licenses/new', authed(async (req, reply, s) => {
    const b = req.body as any;
    try {
      const { license, key } = store.create(validateInput(toInput(b)), s.username);
      return html(reply, 200, page(s, req, 'Licence created', `<h1>Licence created</h1><div class="card">
        <p>Give this activation key to <strong>${esc(license.customer_name)}</strong>. <strong>It is shown only once</strong> — it cannot be recovered later (you can issue a replacement key).</p>
        <div class="key">${esc(key)}</div><div class="actions"><a class="btn" href="/admin/licenses/${esc(license.id)}">Open licence</a></div></div>`));
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
      return html(reply, 400, page(s, req, 'New licence', `<h1>Issue a licence</h1><div class="card">${licenseForm(s, b, '/admin/licenses/new', 'Create licence & generate key', e.message)}</div>`));
    }
  }, { post: true }));

  // ---- detail -------------------------------------------------------------------
  const detail = (s: AdminSession, req: FastifyRequest, id: string, error = '', extra = '') => {
    const l = store.get(id);
    if (!l) return null;
    const acts = store.activations(id);
    const act = (name: string, label: string, cls = '') =>
      `<form method="post" action="/admin/licenses/${esc(id)}/status" class="inline">${csrf(s)}<input type="hidden" name="to" value="${name}"><button class="${cls}">${label}</button></form>`;
    return page(s, req, l.customer_name, `<h1>${esc(l.customer_name)} ${badge(effective(l))}</h1>${extra}
      <div class="card"><div class="actions" style="margin-top:0">
        ${l.status === 'active' ? act('suspended', 'Suspend') + act('revoked', 'Revoke', 'danger') : act('active', 'Reactivate', 'primary') + (l.status === 'suspended' ? act('revoked', 'Revoke', 'danger') : '')}
        <form method="post" action="/admin/licenses/${esc(id)}/rekey" class="inline">${csrf(s)}<button>Issue replacement key</button></form></div>
        <p class="muted">Key ending <code>${esc(l.key_hint)}</code> · created ${fmtDate(l.created_at)}. Suspend/revoke take effect on each device's next successful check-in (within its recheck interval); a device that stays offline keeps working until its offline grace ends.</p></div>
      <h2>Terms</h2><div class="card">${licenseForm(s, {
        customerName: l.customer_name, customerEmail: l.customer_email, notes: l.notes, expiresAt: l.expires_at?.slice(0, 10) ?? '',
        maxDevices: l.max_devices, offlineGraceDays: l.offline_grace_days, recheckHours: l.recheck_hours,
      }, `/admin/licenses/${esc(id)}/update`, 'Save changes', error)}</div>
      <h2>Devices (${acts.filter((a) => a.active).length} of ${l.max_devices} seats in use)</h2><div class="card">
      <table><tr><th>Device</th><th>App</th><th>First seen</th><th>Last check-in</th><th>IP</th><th></th></tr>
      ${acts.map((a) => `<tr><td>${esc(a.device_name)} <span class="muted">${esc(a.device_id.slice(0, 8))}</span> ${a.active ? '' : '<span class="badge revoked">removed</span>'}</td><td>${esc(a.app_version)}</td>
        <td>${fmtDate(a.first_seen_at)}</td><td>${fmtDate(a.last_seen_at)}</td><td>${esc(a.last_ip)}</td>
        <td>${a.active ? `<form method="post" action="/admin/licenses/${esc(id)}/devices/${a.id}/remove" class="inline">${csrf(s)}<button class="danger">Remove</button></form>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Not activated on any device yet.</td></tr>'}</table></div>`);
  };

  app.get('/admin/licenses/:id', authed(async (req, reply, s) => {
    const out = detail(s, req, (req.params as any).id);
    return out ? html(reply, 200, out) : html(reply, 404, page(s, req, 'Not found', '<h1>Licence not found</h1>'));
  }));
  app.post('/admin/licenses/:id/update', authed(async (req, reply, s) => {
    const id = (req.params as any).id;
    try {
      store.update(id, validateInput(toInput(req.body as any)), s.username);
      return flashRedirect(reply, `/admin/licenses/${id}`, 'Saved.');
    } catch (e) {
      if (!(e instanceof ValidationError)) throw e;
      return html(reply, 400, detail(s, req, id, e.message) ?? '');
    }
  }, { post: true }));
  app.post('/admin/licenses/:id/status', authed(async (req, reply, s) => {
    const id = (req.params as any).id;
    const to = (req.body as any).to;
    if (!store.get(id) || !['active', 'suspended', 'revoked'].includes(to)) return redirect(reply, '/admin');
    store.setStatus(id, to, s.username);
    return flashRedirect(reply, `/admin/licenses/${id}`, `Licence is now ${to}.`);
  }, { post: true }));
  app.post('/admin/licenses/:id/rekey', authed(async (req, reply, s) => {
    const id = (req.params as any).id;
    if (!store.get(id)) return redirect(reply, '/admin');
    const key = store.rekey(id, s.username);
    return html(reply, 200, detail(s, req, id, '', `<div class="card"><p>New key (shown once; the old key and all device seats are now invalid):</p><div class="key">${esc(key)}</div></div>`)!);
  }, { post: true }));
  app.post('/admin/licenses/:id/devices/:act/remove', authed(async (req, reply, s) => {
    const { id, act } = req.params as any;
    store.removeDevice(id, Number(act), s.username);
    return flashRedirect(reply, `/admin/licenses/${id}`, 'Device removed; its seat is free again.');
  }, { post: true }));

  // ---- devices & audit ---------------------------------------------------------
  app.get('/admin/devices', authed(async (req, reply, s) => {
    const rows = store.activations();
    return html(reply, 200, page(s, req, 'Devices', `<h1>All device activations</h1><div class="card"><table>
      <tr><th>Customer</th><th>Device</th><th>App</th><th>First seen</th><th>Last check-in</th><th>IP</th><th>State</th></tr>
      ${rows.map((a) => `<tr><td><a href="/admin/licenses/${esc(a.license_id)}">${esc(a.customer_name)}</a></td><td>${esc(a.device_name)} <span class="muted">${esc(a.device_id.slice(0, 8))}</span></td>
      <td>${esc(a.app_version)}</td><td>${fmtDate(a.first_seen_at)}</td><td>${fmtDate(a.last_seen_at)}</td><td>${esc(a.last_ip)}</td><td>${a.active ? 'active' : 'removed'}</td></tr>`).join('')}</table></div>`));
  }));
  app.get('/admin/audit', authed(async (req, reply, s) => {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all() as any[];
    return html(reply, 200, page(s, req, 'Audit log', `<h1>Audit log</h1><div class="card"><table><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr>
      ${rows.map((r) => `<tr><td>${fmtDate(r.at)}</td><td>${esc(r.actor)}</td><td>${esc(r.action)}</td><td>${esc(r.detail)} ${r.license_id ? `<a href="/admin/licenses/${esc(r.license_id)}">↗</a>` : ''}</td></tr>`).join('')}</table></div>`));
  }));

}
