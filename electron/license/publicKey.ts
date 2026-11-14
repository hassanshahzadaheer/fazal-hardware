// Ed25519 public key used to verify signed license files (§27). Safe to ship
// — it can only verify, never sign. Generate the real keypair once with
// `node scripts/generate-license-keypair.js` (keep the private key OUTSIDE
// this repo) and paste its public key here before issuing any real license.
export const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
REPLACE_WITH_REAL_PUBLIC_KEY_FROM_generate-license-keypair_js
-----END PUBLIC KEY-----
`;
