import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

const testDbDir = path.resolve(__dirname, '../../../test-data');
const dbPath = path.join(testDbDir, 'fazal.db');

let showSaveDialogMock = vi.fn();
let showOpenDialogMock = vi.fn();

// electron/db/index.ts falls back to `test-data/fazal.db` when `app.getPath`
// isn't available (true for every other test in this suite, running outside
// the Electron runtime) — mocking `app.getPath` here instead pins the backup
// tests to a predictable path so the save/restore dialog mocks and file
// assertions below can agree on exactly which file is being copied.
vi.mock('electron', () => ({
  app: { getPath: () => testDbDir },
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialogMock(...args),
    showOpenDialog: (...args: unknown[]) => showOpenDialogMock(...args),
  },
}));

describe('backup handler (Task 13.3)', () => {
  beforeEach(() => {
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    for (const suffix of ['', '-wal', '-shm']) {
      const p = `${dbPath}${suffix}`;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    showSaveDialogMock = vi.fn();
    showOpenDialogMock = vi.fn();
  });

  afterEach(async () => {
    const { closeDb } = await import('../../db');
    closeDb();
  });

  it('backupNow checkpoints WAL and copies the live db file to the chosen path', async () => {
    const { initDb } = await import('../../db');
    const { backupNow } = await import('../backup');

    initDb(); // seeds admin via ensureDefaultAdmin, creating real content to back up

    const backupPath = path.join(testDbDir, 'manual-backup.db');
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: backupPath });

    const result = await backupNow();
    expect(result.ok).toBe(true);
    expect(fs.existsSync(backupPath)).toBe(true);

    fs.unlinkSync(backupPath);
  });

  it('backupNow reports CANCELLED when the save dialog is dismissed', async () => {
    const { backupNow } = await import('../backup');
    showSaveDialogMock.mockResolvedValue({ canceled: true });

    const result = await backupNow();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CANCELLED');
  });

  it('restoreBackup replaces the live db with the chosen file and the app can read it again', async () => {
    const { initDb, getDb } = await import('../../db');
    const { backupNow, restoreBackup } = await import('../backup');

    // Create a known-state backup first (1 admin user).
    initDb();
    const backupPath = path.join(testDbDir, 'restore-source.db');
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: backupPath });
    await backupNow();

    // Mutate the live db so it now differs from the backup.
    getDb().prepare("INSERT INTO categories (name) VALUES ('Mutated After Backup')").run();
    const beforeRestore = getDb().prepare('SELECT COUNT(*) as c FROM categories').get() as any;
    expect(beforeRestore.c).toBe(1);

    // Restore from the backup taken before the mutation.
    showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: [backupPath] });
    const result = await restoreBackup();
    expect(result.ok).toBe(true);

    const afterRestore = getDb().prepare('SELECT COUNT(*) as c FROM categories').get() as any;
    expect(afterRestore.c).toBe(0); // the mutation is gone — we're back on the pre-mutation backup

    fs.unlinkSync(backupPath);
  });

  it('restoreBackup reports CANCELLED when the open dialog is dismissed', async () => {
    const { restoreBackup } = await import('../backup');
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await restoreBackup();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CANCELLED');
  });
});
