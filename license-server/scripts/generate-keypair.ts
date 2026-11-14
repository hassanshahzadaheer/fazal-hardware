// One-time: creates the Ed25519 licence-signing keypair.
//   npm run keygen -- ~/.fazal-license-key
// The PRIVATE key stays on the licence server (env/secret store) — never in the repo,
// never in the desktop app. The PUBLIC key is given to the app build (CI variable).
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const dir = path.resolve(process.argv[2] ?? './keys');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const priv = path.join(dir, 'license-signing-private.pem');
if (fs.existsSync(priv)) { console.error(`Refusing to overwrite ${priv}`); process.exit(1); }
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
fs.writeFileSync(priv, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
fs.writeFileSync(path.join(dir, 'license-public.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
console.log(`Private key (SECRET, server only): ${priv}\nPublic key (goes in the app build): ${path.join(dir, 'license-public.pem')}`);
