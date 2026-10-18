import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { initDb, closeDb } from '../../db';
import { get, update } from '../settings';

describe('settings handler (Task 2.1)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_settings.db');

  beforeAll(() => {
    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
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

  it('reads the seeded default row (company_name = Fazal Hardware)', () => {
    const result = get(testDb);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(1);
      expect(result.data.companyName).toBe('Fazal Hardware');
    }
  });

  it('updates company info and persists it', () => {
    const result = update(testDb, {
      companyName: 'Fazal Hardware & Building Materials',
      address: 'Main Bazaar, Lahore',
      phone: '+92 300 1234567',
      email: 'contact@fazalhardware.local',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.companyName).toBe('Fazal Hardware & Building Materials');
      expect(result.data.address).toBe('Main Bazaar, Lahore');
    }

    const reread = get(testDb);
    if (reread.ok) {
      expect(reread.data.companyName).toBe('Fazal Hardware & Building Materials');
    }
  });

  it('rejects an empty company name', () => {
    const result = update(testDb, { companyName: '' });
    expect(result.ok).toBe(false);
  });
});
