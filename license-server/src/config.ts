import * as fs from 'fs';
import * as path from 'path';

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  dbPath: string;
  backupDir: string;
  backupKeep: number;
  signingKeyPem: string;
  keyPepper: string;
  apiEnabled: boolean;
  adminEnabled: boolean;
  secureCookies: boolean;
  trustProxy: boolean;
  defaultGraceDays: number;
  defaultRecheckHours: number;
}

const bool = (v: string | undefined, d: boolean) => (v === undefined ? d : ['1', 'true', 'yes'].includes(v.toLowerCase()));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const dataDir = path.resolve(env.DATA_DIR ?? './data');

  const signingKeyPem =
    env.LICENSE_SIGNING_KEY_PEM?.replace(/\\n/g, '\n') ??
    (env.LICENSE_SIGNING_KEY_FILE ? fs.readFileSync(env.LICENSE_SIGNING_KEY_FILE, 'utf8') : '');
  if (!signingKeyPem.includes('PRIVATE KEY')) {
    throw new Error('Set LICENSE_SIGNING_KEY_PEM or LICENSE_SIGNING_KEY_FILE (Ed25519 private key; run `npm run keygen`).');
  }
  const keyPepper = env.KEY_HASH_PEPPER ?? '';
  if (keyPepper.length < 24) throw new Error('KEY_HASH_PEPPER must be set to a random string of at least 24 characters.');

  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    dataDir,
    dbPath: path.join(dataDir, 'licenses.db'),
    backupDir: path.resolve(env.BACKUP_DIR ?? path.join(dataDir, 'backups')),
    backupKeep: Number(env.BACKUP_KEEP ?? 14),
    signingKeyPem,
    keyPepper,
    apiEnabled: bool(env.API_ENABLED, true),
    adminEnabled: bool(env.ADMIN_ENABLED, true),
    // Secure (HTTPS-only) cookies by default in production; localhost dev needs plain http.
    secureCookies: bool(env.SECURE_COOKIES, production),
    trustProxy: bool(env.TRUST_PROXY, false),
    defaultGraceDays: Number(env.DEFAULT_GRACE_DAYS ?? 7),
    defaultRecheckHours: Number(env.DEFAULT_RECHECK_HOURS ?? 6),
  };
}
