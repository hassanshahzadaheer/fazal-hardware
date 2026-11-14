// Run ONCE to create the signing keypair for license files (§27).
//
//   node scripts/generate-license-keypair.js [output-dir]
//
// Writes private.pem + public.pem to output-dir (default: ~/.fazal-license-key,
// OUTSIDE this repo — refuses to write inside the repo). Paste public.pem's
// contents into electron/license/publicKey.ts, then back private.pem up
// somewhere safe (password manager, encrypted drive) and never commit it —
// anyone who has it can mint valid licenses for this app.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(process.argv[2] || path.join(os.homedir(), '.fazal-license-key'));

if (outDir.startsWith(repoRoot)) {
  console.error(`Refusing to write the private key inside the repo (${repoRoot}).`);
  console.error('Pass a path outside the repo, e.g. ~/.fazal-license-key');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });

fs.writeFileSync(path.join(outDir, 'private.pem'), privatePem, { mode: 0o600 });
fs.writeFileSync(path.join(outDir, 'public.pem'), publicPem, { mode: 0o644 });

console.log(`Keypair written to ${outDir}`);
console.log('');
console.log('Paste this into electron/license/publicKey.ts as LICENSE_PUBLIC_KEY_PEM:');
console.log('');
console.log(publicPem);
console.log(`Private key: ${path.join(outDir, 'private.pem')} — back it up, never commit it.`);
