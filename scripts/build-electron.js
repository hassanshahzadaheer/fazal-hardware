const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
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
  });
  console.log('Main process built for production.');
}

build().catch(err => {
  console.error('Electron build failed:', err);
  process.exit(1);
});
