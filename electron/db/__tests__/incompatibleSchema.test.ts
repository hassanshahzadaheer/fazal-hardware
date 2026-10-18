import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../index';

// Regression test for a real bug hit on 2026-10-18: a dev machine still had a
// database file from before the Phase 0 schema reset. Its schema_migrations
// table already recorded version 1 as applied (the OLD, incompatible 0001),
// so the migration runner silently skipped re-running the NEW 0001_init.sql —
// the new tables never got created, and login crashed deep inside better-sqlite3
// with a cryptic "no such column: email" instead of a clear, actionable error.
describe('Incompatible pre-reset database guard', () => {
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_stale.db');

  afterEach(() => {
    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = `${testDbPath}${suffix}`;
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {
          // ignore
        }
      }
    }
  });

  it('fails fast with a clear, actionable message instead of a cryptic SQL error', () => {
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    // Simulate the old, pre-reset schema: schema_migrations already has version 1
    // recorded as applied, but `users` predates the new `email` column.
    const staleDb = new Database(testDbPath);
    staleDb.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      INSERT INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
      CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL);
    `);
    staleDb.close();

    expect(() => initDb(testDbPath)).toThrow(/incompatible/i);
  });

  it('does not false-positive on a genuinely fresh database', () => {
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    expect(() => initDb(testDbPath)).not.toThrow();
  });
});
