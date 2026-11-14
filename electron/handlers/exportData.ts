import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// Full business-data export as one CSV per table. Always available — even when a
// licence is restricted — so a shop can never be locked away from its own records.
// Excludes the users table (password hashes) and internal bookkeeping.
const EXCLUDED = new Set(['users', 'schema_migrations']);

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @ at cell start).
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportAllCsv(db: Database.Database, targetDir: string): { dir: string; tables: number } {
  const dir = path.join(targetDir, `fazal-export-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(dir, { recursive: true });
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[])
    .map((t) => t.name)
    .filter((n) => !EXCLUDED.has(n));

  for (const name of tables) {
    const rows = db.prepare(`SELECT * FROM "${name.replace(/"/g, '""')}"`).all() as Record<string, unknown>[];
    const cols = (db.prepare(`PRAGMA table_info("${name.replace(/"/g, '""')}")`).all() as { name: string }[]).map((c) => c.name);
    const lines = [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))];
    fs.writeFileSync(path.join(dir, `${name}.csv`), '﻿' + lines.join('\r\n'), 'utf8'); // BOM: Excel reads UTF-8 (Urdu) correctly
  }
  return { dir, tables: tables.length };
}
