import { loadConfig } from './config';
import { openDb, backupDb } from './db';
import { buildApp } from './app';

const config = loadConfig();
const db = openDb(config.dbPath);
const { app } = buildApp(config, db);

// Daily consistent snapshot (VACUUM INTO). Copy BACKUP_DIR off-machine too — see README.
const snapshot = () => {
  try { console.log('db backup:', backupDb(db, config.backupDir, config.backupKeep)); }
  catch (e) { console.error('db backup FAILED', e); }
};
snapshot();
setInterval(snapshot, 24 * 3_600_000).unref();
// Prune stale admin sessions / old login attempts hourly.
setInterval(() => {
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(new Date().toISOString());
  db.prepare('DELETE FROM login_attempts WHERE at < ?').run(new Date(Date.now() - 86_400_000).toISOString());
}, 3_600_000).unref();

app.listen({ port: config.port, host: config.host }).then(() => {
  console.log(`licence server on ${config.host}:${config.port} (api=${config.apiEnabled} admin=${config.adminEnabled})`);
  if (!config.secureCookies) console.warn('WARNING: SECURE_COOKIES is off — only acceptable for local development.');
});
const stop = () => app.close().then(() => { db.close(); process.exit(0); });
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
