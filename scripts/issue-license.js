// Issue a signed license file for a client (§27).
//
//   node scripts/issue-license.js --client "Fazal Hardware" --days 30 \
//     --key ~/.fazal-license-key/private.pem --out ./fazal-hardware.license.json
//
// Give the output file to the client to import via the app's "Import
// License File" screen. Requires the private key from
// generate-license-keypair.js — never ships with the app.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const clientName = args.client;
const days = Number(args.days);
const keyPath = args.key;
const outPath = path.resolve(args.out || `${(clientName || 'license').replace(/\s+/g, '-').toLowerCase()}.license.json`);

if (!clientName || !days || !keyPath) {
  console.error('Usage: node scripts/issue-license.js --client "<name>" --days <n> --key <private.pem path> [--out <file>]');
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(path.resolve(keyPath), 'utf8');

const issuedAt = new Date();
const expiresAt = new Date(issuedAt.getTime() + days * 24 * 60 * 60 * 1000);

const payload = {
  licenseId: crypto.randomUUID(),
  clientName,
  issuedAt: issuedAt.toISOString(),
  expiresAt: expiresAt.toISOString(),
};

// Must match electron/license/verify.ts's canonicalizePayload exactly — same
// fixed key order — or the app will reject this as an invalid signature.
const canonical = JSON.stringify(payload, ['licenseId', 'clientName', 'issuedAt', 'expiresAt']);
const signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKeyPem).toString('base64');

fs.writeFileSync(outPath, JSON.stringify({ payload, signature }, null, 2));

console.log(`License issued for "${clientName}", valid until ${expiresAt.toISOString().slice(0, 10)}`);
console.log(`Written to ${outPath}`);
