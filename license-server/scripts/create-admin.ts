// Creates the owner account interactively. The password and TOTP secret are never
// stored in env vars, files or shell history — only a scrypt hash + the TOTP secret in the DB.
//   KEY_HASH_PEPPER=... LICENSE_SIGNING_KEY_FILE=... npm run create-admin -- <username>
import * as readline from 'readline';
import { loadConfig } from '../src/config';
import { openDb } from '../src/db';
import { hashPassword, newTotpSecret } from '../src/crypto';

async function ask(q: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) (rl as any)._writeToOutput = () => undefined;
  return new Promise((res) => rl.question(q, (a) => { rl.close(); if (hidden) console.log(); res(a); }));
}

(async () => {
  const username = process.argv[2];
  if (!username) { console.error('Usage: npm run create-admin -- <username>'); process.exit(1); }
  const config = loadConfig();
  const db = openDb(config.dbPath);
  const pw = await ask('Password (min 14 chars): ', true);
  if (pw.length < 14) { console.error('Password too short.'); process.exit(1); }
  if (pw !== (await ask('Repeat password: ', true))) { console.error('Passwords differ.'); process.exit(1); }
  const secret = newTotpSecret();
  db.prepare('INSERT INTO admins (username, password_hash, totp_secret, created_at) VALUES (?,?,?,?)')
    .run(username, hashPassword(pw), secret, new Date().toISOString());
  console.log(`\nAdmin "${username}" created.\nAdd this to your authenticator app NOW (shown once):`);
  console.log(`  otpauth://totp/Fazal%20Licensing:${encodeURIComponent(username)}?secret=${secret}&issuer=Fazal%20Licensing`);
  console.log(`  (manual entry secret: ${secret})`);
})();
