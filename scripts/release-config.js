// Resolves + validates the licence settings baked into the desktop app at build time.
//
//   LICENSE_SERVER_URL        https URL of the production licence service
//   LICENSE_PUBLIC_KEY_PEM    Ed25519 PUBLIC key (PEM) matching the server's signing key
//   LICENSE_PUBLIC_KEY_B64    alternative: the same PEM, base64-encoded (easier in CI variables)
//   FAZAL_RELEASE=1           production build: refuse dev/placeholder values
//
// Both values are public by design. The private signing key never reaches this repo or app.
const crypto = require('crypto');

const BAD_HOST = /(^|\.)(localhost|example\.(com|org|net)|test|invalid|local|localdomain)$|^127\.|^0\.0\.0\.0$|^\[?::1\]?$|^10\.|^192\.168\./i;

function resolveReleaseConfig(env) {
  const release = env.FAZAL_RELEASE === '1';
  const serverUrl = (env.LICENSE_SERVER_URL || '').trim();
  let publicKeyPem = (env.LICENSE_PUBLIC_KEY_PEM || '').replace(/\\n/g, '\n').trim();
  if (!publicKeyPem && env.LICENSE_PUBLIC_KEY_B64) {
    publicKeyPem = Buffer.from(env.LICENSE_PUBLIC_KEY_B64, 'base64').toString('utf8').trim();
  }
  if (publicKeyPem) publicKeyPem += '\n';

  if (release) {
    const problems = [];
    let u;
    try { u = new URL(serverUrl); } catch { /* handled below */ }
    if (!u) problems.push('LICENSE_SERVER_URL is missing or not a valid URL.');
    else {
      if (u.protocol !== 'https:') problems.push(`LICENSE_SERVER_URL must be https:// (got ${u.protocol}//).`);
      if (BAD_HOST.test(u.hostname)) problems.push(`LICENSE_SERVER_URL host "${u.hostname}" is a local/example address — set the real production URL.`);
    }
    try {
      const k = crypto.createPublicKey(publicKeyPem);
      if (k.asymmetricKeyType !== 'ed25519') problems.push('LICENSE_PUBLIC_KEY must be an Ed25519 public key.');
    } catch {
      problems.push('LICENSE_PUBLIC_KEY_PEM / LICENSE_PUBLIC_KEY_B64 is missing or not a valid public key.');
    }
    if (problems.length) {
      throw new Error('Refusing to build a RELEASE:\n  - ' + problems.join('\n  - '));
    }
  }
  return { release, serverUrl, publicKeyPem };
}

module.exports = { resolveReleaseConfig };
