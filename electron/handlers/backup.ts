import * as fs from 'fs';
import { dialog } from 'electron';
import log from 'electron-log';
import { Result } from '../../shared/types';
import { getDb, getDbPath, closeDb, initDb } from '../db';

// §25.4: export/import the SQLite file as the backup mechanism.
export async function backupNow(): Promise<Result<string>> {
  try {
    const db = getDb();
    // Flush the WAL into the main file first so the backup is self-contained —
    // otherwise recent writes could be sitting in a .db-wal file we don't copy.
    db.pragma('wal_checkpoint(TRUNCATE)');

    const defaultName = `fazal-hardware-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePath) {
      return { ok: false, error: { code: 'CANCELLED', message: 'Backup cancelled' } };
    }

    fs.copyFileSync(getDbPath(), result.filePath);
    log.info(`Backup saved to ${result.filePath}`);
    return { ok: true, data: result.filePath };
  } catch (err: any) {
    return { ok: false, error: { code: 'BACKUP_FAILED', message: err.message ?? 'Backup failed' } };
  }
}

export async function restoreBackup(): Promise<Result<null>> {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { ok: false, error: { code: 'CANCELLED', message: 'Restore cancelled' } };
    }

    const sourcePath = result.filePaths[0];
    const dbPath = getDbPath();

    closeDb();
    fs.copyFileSync(sourcePath, dbPath);
    // Drop stale WAL/SHM files from the previous database so they aren't
    // replayed against the just-restored file.
    for (const suffix of ['-wal', '-shm']) {
      const p = `${dbPath}${suffix}`;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    initDb();

    log.info(`Database restored from ${sourcePath}`);
    return { ok: true, data: null };
  } catch (err: any) {
    return { ok: false, error: { code: 'RESTORE_FAILED', message: err.message ?? 'Restore failed' } };
  }
}
