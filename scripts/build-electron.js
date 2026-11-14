const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { resolveReleaseConfig } = require('./release-config');

async function build() {
  // Licence server URL + public verification key are baked in at build time. A release
  // build (FAZAL_RELEASE=1) refuses to proceed with dev/placeholder values.
  const cfg = resolveReleaseConfig(process.env);
  console.log(`Licence server: ${cfg.serverUrl || '(dev default http://localhost:8787)'}  [${cfg.release ? 'RELEASE' : 'dev/test'} build]`);

  // Ensure the migrations directory is copied to dist-electron/db/migrations
  const srcMigDir = path.resolve(__dirname, '../electron/db/migrations');
  const destMigDir = path.resolve(__dirname, '../dist-electron/db/migrations');
  
  if (!fs.existsSync(destMigDir)) {
    fs.mkdirSync(destMigDir, { recursive: true });
  }
  
  if (fs.existsSync(srcMigDir)) {
    fs.readdirSync(srcMigDir).forEach(file => {
      if (file.endsWith('.sql')) {
        fs.copyFileSync(path.join(srcMigDir, file), path.join(destMigDir, file));
      }
    });
    console.log('Migration SQL files copied to output directory.');
  }

  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, '../electron/main.ts'),
      path.resolve(__dirname, '../electron/preload.ts')
    ],
    bundle: true,
    platform: 'node',
    external: ['electron', 'better-sqlite3'],
    outdir: path.resolve(__dirname, '../dist-electron'),
    format: 'cjs',
    minify: true,
    define: {
      __LICENSE_SERVER_URL__: JSON.stringify(cfg.serverUrl),
      __LICENSE_PUBLIC_KEY_PEM__: JSON.stringify(cfg.publicKeyPem),
      // Never true in a release build: production must use HTTPS.
      __ALLOW_INSECURE_LOCALHOST__: JSON.stringify(!cfg.release),
    },
  });
  console.log('Main process built for production.');
}

build().catch(err => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
