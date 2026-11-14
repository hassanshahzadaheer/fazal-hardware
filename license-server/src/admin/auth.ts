import Database from 'better-sqlite3';
import { FastifyReply, FastifyRequest } from 'fastify';
import { randomToken, sha256, verifyPassword, verifyTotp, safeEqual } from '../crypto';
import { audit } from '../db';

const IDLE_MS = 30 * 60_000;
const ABSOLUTE_MS = 8 * 3_600_000;
const LOCK_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export interface AdminSession {
  adminId: number;
  username: string;
  csrf: string;
  tokenHash: string;
}

export function cookieName(secure: boolean) {
  return secure ? '__Host-fz_admin' : 'fz_admin';
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function setSessionCookie(reply: FastifyReply, secure: boolean, token: string | null) {
  const flags = ['HttpOnly', 'SameSite=Strict', 'Path=/', ...(secure ? ['Secure'] : [])];
  const value = token ? `${cookieName(secure)}=${token}; Max-Age=${ABSOLUTE_MS / 1000}; ${flags.join('; ')}`
    : `${cookieName(secure)}=; Max-Age=0; ${flags.join('; ')}`;
  reply.header('Set-Cookie', value);
}

export function getSession(db: Database.Database, req: FastifyRequest, secure: boolean, now = Date.now()): AdminSession | null {
  const token = parseCookies(req.headers.cookie)[cookieName(secure)];
  if (!token) return null;
  const tokenHash = sha256(token);
  const row = db.prepare(
    `SELECT s.*, a.username FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?`
  ).get(tokenHash) as any;
  if (!row) return null;
  if (now > Date.parse(row.expires_at) || now - Date.parse(row.last_seen_at) > IDLE_MS) {
    db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  db.prepare('UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?').run(new Date(now).toISOString(), tokenHash);
  return { adminId: row.admin_id, username: row.username, csrf: row.csrf_token, tokenHash };
}

export function createSession(db: Database.Database, adminId: number, now = Date.now()): { token: string } {
  const token = randomToken();
  db.prepare('INSERT INTO admin_sessions (token_hash, admin_id, csrf_token, created_at, last_seen_at, expires_at) VALUES (?,?,?,?,?,?)')
    .run(sha256(token), adminId, randomToken(), new Date(now).toISOString(), new Date(now).toISOString(), new Date(now + ABSOLUTE_MS).toISOString());
  return { token };
}

export function checkCsrf(session: AdminSession, body: any): boolean {
  return typeof body?._csrf === 'string' && safeEqual(body._csrf, session.csrf);
}

export type LoginResult = { ok: true; adminId: number } | { ok: false; message: string };

export function attemptLogin(
  db: Database.Database, username: string, password: string, totp: string, ip: string, now = Date.now()
): LoginResult {
  const generic: LoginResult = { ok: false, message: 'Invalid username, password or authentication code.' };
  const since = new Date(now - LOCK_WINDOW_MS).toISOString();
  const failures = (db.prepare(
    'SELECT COUNT(*) c FROM login_attempts WHERE success = 0 AND at > ? AND (username = ? OR ip = ?)'
  ).get(since, username, ip) as { c: number }).c;
  if (failures >= MAX_FAILURES) return { ok: false, message: 'Too many failed attempts. Try again in 15 minutes.' };

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;
  const passwordOk = verifyPassword(password, admin?.password_hash ?? null);
  const step = admin ? verifyTotp(admin.totp_secret, totp, now) : null;
  // A TOTP step may be used once: blocks replay of an observed code.
  const totpOk = step !== null && step > admin.last_totp_step;

  const ok = Boolean(admin) && passwordOk && totpOk;
  db.prepare('INSERT INTO login_attempts (at, username, ip, success) VALUES (?,?,?,?)').run(new Date(now).toISOString(), username, ip, ok ? 1 : 0);
  if (!ok) {
    audit(db, username || '(blank)', 'admin.login_failed', null, ip);
    return generic;
  }
  db.prepare('UPDATE admins SET last_totp_step = ? WHERE id = ?').run(step, admin.id);
  audit(db, username, 'admin.login', null, ip);
  return { ok: true, adminId: admin.id };
}
