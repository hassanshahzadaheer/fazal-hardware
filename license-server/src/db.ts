import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_hint TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','revoked')),
  expires_at TEXT,
  max_devices INTEGER NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
  offline_grace_days INTEGER NOT NULL DEFAULT 7 CHECK (offline_grace_days >= 0),
  recheck_hours INTEGER NOT NULL DEFAULT 6 CHECK (recheck_hours >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id TEXT NOT NULL REFERENCES licenses(id),
  device_id TEXT NOT NULL,
  device_name TEXT,
  app_version TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_ip TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (license_id, device_id)
);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  last_totp_step INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id),
  csrf_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  username TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  license_id TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_act_license ON activations(license_id);
CREATE INDEX IF NOT EXISTS idx_attempts_at ON login_attempts(at);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
`;

export function openDb(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

export function backupDb(db: Database.Database, dir: string, keep: number): string {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `licenses-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const old = fs.readdirSync(dir).filter((f) => f.startsWith('licenses-') && f.endsWith('.db')).sort().slice(0, -keep);
  for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  return target;
}

export function audit(db: Database.Database, actor: string, action: string, licenseId: string | null, detail?: string): void {
  db.prepare('INSERT INTO audit_log (at, actor, action, license_id, detail) VALUES (?,?,?,?,?)').run(
    new Date().toISOString(), actor, action, licenseId, detail ?? null
  );
}
