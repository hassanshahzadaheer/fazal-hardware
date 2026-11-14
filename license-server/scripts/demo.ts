// LOCAL DEMO ONLY. Seeds a demo owner account + sample licence, and prints login codes.
//   npm run demo -- setup      create owner (password: demo-owner-password) + 1 licence, print everything
//   npm run demo -- code       print the current 6-digit authenticator code for the demo owner
//   npm run demo -- newkey     issue another licence key
import { loadConfig } from '../src/config';
import { openDb } from '../src/db';
import { LicenseStore } from '../src/licenses';
import { hashPassword, newTotpSecret, totpAt } from '../src/crypto';

const cfg = loadConfig();
const db = openDb(cfg.dbPath);
const store = new LicenseStore(db, cfg);
const cmd = process.argv[2] ?? 'setup';
const terms = { customerName: 'Demo Hardware Shop', customerEmail: 'demo@shop.pk', maxDevices: 2, offlineGraceDays: 7, recheckHours: 6 };

if (cmd === 'setup') {
  if (!db.prepare('SELECT 1 FROM admins WHERE username = ?').get('owner')) {
    db.prepare('INSERT INTO admins (username, password_hash, totp_secret, created_at) VALUES (?,?,?,?)')
      .run('owner', hashPassword('demo-owner-password'), newTotpSecret(), new Date().toISOString());
  }
  const { key } = store.create(terms, 'demo');
  console.log('Dashboard: http://localhost:8787/admin   user: owner   password: demo-owner-password');
  console.log('Authenticator code: run  ./code.sh  (changes every 30s)');
  console.log(`Activation key for the app: ${key}`);
} else if (cmd === 'code') {
  const a = db.prepare('SELECT totp_secret FROM admins WHERE username = ?').get('owner') as { totp_secret: string };
  console.log(totpAt(a.totp_secret, Math.floor(Date.now() / 30000)));
} else if (cmd === 'newkey') {
  console.log(store.create({ ...terms, customerName: 'Another Demo Shop' }, 'demo').key);
}
