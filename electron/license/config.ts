// Build-time constants, injected by scripts/build-electron.js (esbuild `define`).
// Nothing here is a secret: the public key can only VERIFY leases, and the URL is
// where the app phones home. Release builds (FAZAL_RELEASE=1) fail to build unless
// both are real production values — see scripts/build-electron.js.
declare const __LICENSE_SERVER_URL__: string | undefined;
declare const __LICENSE_PUBLIC_KEY_PEM__: string | undefined;
declare const __ALLOW_INSECURE_LOCALHOST__: boolean | undefined;

// True only for non-release builds (local demo / dev). Release builds define it false.
export const ALLOW_INSECURE_LOCALHOST: boolean =
  typeof __ALLOW_INSECURE_LOCALHOST__ !== 'undefined' ? __ALLOW_INSECURE_LOCALHOST__ : false;

export const LICENSE_SERVER_URL: string =
  typeof __LICENSE_SERVER_URL__ !== 'undefined' && __LICENSE_SERVER_URL__ ? __LICENSE_SERVER_URL__ : 'http://localhost:8787';

export const LICENSE_PUBLIC_KEY_PEM: string =
  typeof __LICENSE_PUBLIC_KEY_PEM__ !== 'undefined' && __LICENSE_PUBLIC_KEY_PEM__ ? __LICENSE_PUBLIC_KEY_PEM__ : '';
