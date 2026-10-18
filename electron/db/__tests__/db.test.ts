import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDb, closeDb } from '../index';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

describe('Database Initialization (Task 1.1 — Phase 1 schema)', () => {
  let testDb: Database.Database;
  const testDbDir = path.resolve(__dirname, '../../../test-data');
  const testDbPath = path.join(testDbDir, 'test_fazal_schema.db');

  const EXPECTED_TABLES = [
    'schema_migrations',
    'categories',
    'brands',
    'products',
    'customers',
    'suppliers',
    'quotations',
    'sale_invoices',
    'purchase_orders',
    'stock_movements',
    'payments',
    'expenses',
    'users',
    'settings',
    'doc_sequences',
  ];

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

  it('creates every table required by the Phase 1 schema', () => {
    const tables = testDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    for (const expected of EXPECTED_TABLES) {
      expect(tableNames).toContain(expected);
    }
  });

  it('enforces foreign keys', () => {
    const row = testDb.pragma('foreign_keys', { simple: true });
    expect(row).toBe(1);
  });

  it('seeds exactly one settings row defaulting to company_name = Fazal Hardware', () => {
    const rows = testDb.prepare('SELECT * FROM settings').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].company_name).toBe('Fazal Hardware');
  });

  it('seeds a doc_sequences counter row for each document type that needs sequential numbers', () => {
    const rows = testDb.prepare('SELECT doc_type, current_value FROM doc_sequences').all() as any[];
    const byType = Object.fromEntries(rows.map((r) => [r.doc_type, r.current_value]));

    expect(byType).toHaveProperty('sale_invoice', 0);
    expect(byType).toHaveProperty('purchase_order', 0);
    expect(byType).toHaveProperty('quotation', 0);
  });

  it('rejects a stock_movement referencing a non-existent product (foreign key enforced)', () => {
    expect(() => {
      testDb
        .prepare(
          `INSERT INTO stock_movements (product_id, type, quantity, reference_type, reference_id)
           VALUES (999999, 'opening', 10, 'opening', NULL)`
        )
        .run();
    }).toThrow();
  });
});
