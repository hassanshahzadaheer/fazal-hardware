const esbuild = require('esbuild');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function start() {
  console.log('Ensuring native dependencies are built for Electron...');
  try {
    execSync('npx electron-builder install-app-deps', { stdio: 'inherit' });
  } catch (err) {
    console.warn('Warning: Native dependencies rebuild failed. Attempting to continue...', err);
  }

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

  // Build main and preload
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
    sourcemap: true,
  });

  console.log('Main process files compiled.');

  // Start Vite dev server in background
  const vite = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true,
  });

  // Give Vite some time to spin up
  setTimeout(() => {
    console.log('Launching Electron...');
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    electron.on('close', () => {
      console.log('Electron closed. Shutting down Vite...');
      vite.kill();
      process.exit();
    });
  }, 2000);
}

start().catch(err => {
  console.error('Failed to start dev runner:', err);
  process.exit(1);
});
