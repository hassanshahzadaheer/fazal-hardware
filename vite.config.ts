import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    // better-sqlite3's native binding segfaults when multiple test files load it
    // inside vitest's default worker-thread pool (shared memory across threads).
    // Running each test file in its own process avoids it.
    pool: 'forks',
  },
});
