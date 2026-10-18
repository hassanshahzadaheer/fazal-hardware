import Database from 'better-sqlite3';
import { Result, Settings } from '../../shared/types';
import { settingsUpdateSchema } from '../../shared/schemas';

interface SettingsRow {
  id: 1;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_date: string;
  updated_date: string;
}

function mapRow(row: SettingsRow): Settings {
  return {
    id: 1,
    companyName: row.company_name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    createdDate: row.created_date,
    updatedDate: row.updated_date,
  };
}

export function get(db: Database.Database): Result<Settings> {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow;
  return { ok: true, data: mapRow(row) };
}

export function update(db: Database.Database, payload: unknown): Result<Settings> {
  const parsed = settingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const { companyName, address, phone, email } = parsed.data;
  db.prepare(
    `UPDATE settings SET company_name = ?, address = ?, phone = ?, email = ?, updated_date = datetime('now') WHERE id = 1`
  ).run(companyName, address ?? null, phone ?? null, email ?? null);
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as SettingsRow;
  return { ok: true, data: mapRow(row) };
}
