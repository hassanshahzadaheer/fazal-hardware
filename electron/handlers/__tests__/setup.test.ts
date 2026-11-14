import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { initDb } from '../../db';
import { getStatus, complete } from '../setup';
import { exportAllCsv } from '../exportData';

function freshDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fazal-setup-'));
  return { dir, db: initDb(path.join(dir, 't.db'), { backupDir: path.join(dir, 'b') }) };
}

describe('first-run setup', () => {
  let ctx: ReturnType<typeof freshDb>;
  beforeEach(() => { ctx = freshDb(); });

  it('a brand-new database is NOT set up; completing marks it done and saves shop details', () => {
    expect(getStatus(ctx.db)).toEqual({ ok: true, data: { setupCompleted: false, hasExistingData: false } });
    const res = complete(ctx.db, { companyName: 'Noor Hardware', address: 'Mall Rd', phone: '0300', email: 'a@b.pk' });
    expect(res.ok && res.data.setupCompleted).toBe(true);
    const row = ctx.db.prepare('SELECT * FROM settings').get() as any;
    expect(row).toMatchObject({ company_name: 'Noor Hardware', address: 'Mall Rd' });
  });

  it('replaces the factory-default admin credentials when the owner chooses their own', () => {
    complete(ctx.db, { companyName: 'X', admin: { email: 'owner@shop.pk', password: 'a-strong-pass' } });
    const u = ctx.db.prepare('SELECT * FROM users').all() as any[];
    expect(u).toHaveLength(1);
    expect(u[0].email).toBe('owner@shop.pk');
    expect(bcrypt.compareSync('a-strong-pass', u[0].password_hash)).toBe(true);
    expect(bcrypt.compareSync('admin123', u[0].password_hash)).toBe(false);
  });

  it('never overwrites credentials an existing shop already changed', () => {
    ctx.db.prepare('UPDATE users SET password_hash = ?').run(bcrypt.hashSync('their-own-password', 10));
    complete(ctx.db, { companyName: 'X', admin: { email: 'new@shop.pk', password: 'attacker-chosen-1' } });
    const u = ctx.db.prepare('SELECT * FROM users').get() as any;
    expect(u.email).toBe('admin@fazalhardware.local');
    expect(bcrypt.compareSync('their-own-password', u.password_hash)).toBe(true);
  });

  it('does not touch existing business data and validates input', () => {
    ctx.db.prepare("INSERT INTO customers (name, type) VALUES ('Ali', 'retail')").run();
    expect(getStatus(ctx.db)).toMatchObject({ ok: true, data: { hasExistingData: true } });
    complete(ctx.db, { companyName: 'X' });
    expect((ctx.db.prepare('SELECT COUNT(*) c FROM customers').get() as any).c).toBe(1);
    expect(complete(ctx.db, { companyName: '  ' }).ok).toBe(false);
    expect(complete(ctx.db, { companyName: 'X', admin: { email: 'a@b.pk', password: 'short' } }).ok).toBe(false);
  });
});

describe('data export (available even when licence is restricted)', () => {
  it('writes one CSV per business table, excluding users/password hashes, and neutralises formulas', () => {
    const { dir, db } = freshDb();
    db.prepare("INSERT INTO customers (name, type) VALUES ('=HYPERLINK(\"x\")', 'retail')").run();
    const out = exportAllCsv(db, dir);
    const files = fs.readdirSync(out.dir);
    expect(files).toContain('customers.csv');
    expect(files).not.toContain('users.csv');
    const csv = fs.readFileSync(path.join(out.dir, 'customers.csv'), 'utf8');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain('password_hash');
  });
});
