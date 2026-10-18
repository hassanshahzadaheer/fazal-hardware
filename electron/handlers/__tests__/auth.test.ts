import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';
import { initDb, closeDb } from '../../db';
import { login, ensureDefaultAdmin } from '../auth';

describe('auth handler (Task 1.3)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_auth.db');

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore lock errors from a crashed previous run
      }
    }
    // initDb runs migrations AND seeds the default admin (wired in electron/db/index.ts).
    testDb = initDb(testDbPath);
  });

  afterAll(() => {
    testDb.close();
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

  it('seeds exactly one default admin when the users table is empty', () => {
    const count = testDb.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    expect(count.c).toBe(1);
    const admin = testDb.prepare("SELECT * FROM users WHERE role = 'admin'").get() as any;
    expect(admin.email).toBe('admin@fazalhardware.local');
    expect(admin.is_active).toBe(1);
  });

  it('is idempotent — calling ensureDefaultAdmin again does not seed a second admin', () => {
    ensureDefaultAdmin(testDb);
    const count = testDb.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    expect(count.c).toBe(1);
  });

  it('rejects an unknown email', () => {
    const result = login(testDb, { email: 'nobody@fazalhardware.local', password: 'admin123' });
    expect(result.ok).toBe(false);
  });

  it('rejects a wrong password', () => {
    const result = login(testDb, { email: 'admin@fazalhardware.local', password: 'wrong-password' });
    expect(result.ok).toBe(false);
  });

  it('rejects an inactive user even with the correct password', () => {
    const hash = bcrypt.hashSync('secret123', 10);
    testDb
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, 'Inactive User', 'admin', 0)`
      )
      .run('inactive@fazalhardware.local', hash);

    const result = login(testDb, { email: 'inactive@fazalhardware.local', password: 'secret123' });
    expect(result.ok).toBe(false);
  });

  it('accepts the correct email/password and returns a session user', () => {
    const result = login(testDb, { email: 'admin@fazalhardware.local', password: 'admin123' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe('admin@fazalhardware.local');
      expect(result.data.role).toBe('admin');
    }
  });

  it('records last_login_at on successful login', () => {
    testDb.prepare('UPDATE users SET last_login_at = NULL WHERE email = ?').run('admin@fazalhardware.local');

    login(testDb, { email: 'admin@fazalhardware.local', password: 'admin123' });

    const after = testDb.prepare('SELECT last_login_at FROM users WHERE email = ?').get('admin@fazalhardware.local') as any;
    expect(after.last_login_at).not.toBeNull();
  });

  it('rejects malformed input via the shared loginSchema before touching the database', () => {
    const result = login(testDb, { email: 'not-an-email', password: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
