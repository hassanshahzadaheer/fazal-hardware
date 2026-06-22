import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDb, closeDb, resolveMigrationsDir } from '../index';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcryptjs';

describe('Database Initialization & Seeding', () => {
  let testDb: Database.Database;
  // Use a local test DB name for testing
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal.db');

  beforeAll(() => {
    // Create test folder
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    // Clean old test DB
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (err) {
        // file might be locked if previous test run crashed
      }
    }
    testDb = initDb(testDbPath);
  });

  afterAll(() => {
    testDb.close();
    closeDb();
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also remove WAL files if they exist
      const walPath = `${testDbPath}-wal`;
      const shmPath = `${testDbPath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    } catch (err) {
      // ignore lock errors on cleanup
    }
  });

  it('should run migrations and create all tables', () => {
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map(t => t.name);
    
    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('stock_ledger');
    expect(tableNames).toContain('party_ledger');
  });

  it('should seed default users and settings', () => {
    const settings = testDb.prepare("SELECT * FROM settings WHERE id = 1").get() as any;
    expect(settings).toBeDefined();
    expect(settings.company_name).toBe('Fazal Plywood Store');

    const admin = testDb.prepare("SELECT * FROM users WHERE username = 'admin'").get() as any;
    expect(admin).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(bcrypt.compareSync('admin123', admin.password_hash)).toBe(true);

    const cashier = testDb.prepare("SELECT * FROM users WHERE username = 'cashier'").get() as any;
    expect(cashier).toBeDefined();
    expect(cashier.role).toBe('cashier');
    expect(bcrypt.compareSync('cashier123', cashier.password_hash)).toBe(true);
  });

  it('should seed sample products and cities', () => {
    const productsCount = testDb.prepare("SELECT COUNT(*) as count FROM products").get() as any;
    expect(productsCount.count).toBeGreaterThan(20);

    const citiesCount = testDb.prepare("SELECT COUNT(*) as count FROM cities").get() as any;
    expect(citiesCount.count).toBe(18);
  });
});

describe('Migration directory resolution', () => {
  const tempRoot = path.resolve(__dirname, '../../../test-data/migration-resolution');

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('finds migrations in the bundled dist-electron/db/migrations layout', () => {
    const sourceLayout = path.join(tempRoot, 'dist-electron', 'migrations');
    const bundledLayout = path.join(tempRoot, 'dist-electron', 'db', 'migrations');
    fs.mkdirSync(bundledLayout, { recursive: true });

    expect(resolveMigrationsDir([sourceLayout, bundledLayout])).toBe(bundledLayout);
  });

  it('throws when no migration directory exists', () => {
    expect(() => resolveMigrationsDir([path.join(tempRoot, 'missing')]))
      .toThrow('Database migrations directory not found');
  });
});
