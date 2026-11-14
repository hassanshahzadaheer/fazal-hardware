import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Result, SetupStatus } from '../../shared/types';
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from './auth';

// First-run setup (shop details + owner credentials). Activation and the Gemini
// key are handled by their own modules; this one only touches the local DB and
// NEVER seeds or overwrites business data.

const setupSchema = z.object({
  companyName: z.string().trim().min(1, 'Shop name is required'),
  address: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().email('Invalid email address').nullable().optional().or(z.literal('')),
  admin: z
    .object({
      email: z.string().trim().email('Enter a valid admin email'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    })
    .optional(),
});

export function getStatus(db: Database.Database): Result<SetupStatus> {
  const row = db.prepare('SELECT setup_completed_at FROM settings WHERE id = 1').get() as { setup_completed_at: string | null };
  const hasExistingData = ['products', 'customers', 'sale_invoices', 'purchase_orders'].some((t) => {
    try {
      return Boolean(db.prepare(`SELECT 1 FROM ${t} LIMIT 1`).get());
    } catch {
      return false;
    }
  });
  return { ok: true, data: { setupCompleted: row.setup_completed_at !== null, hasExistingData } };
}

export function complete(db: Database.Database, payload: unknown): Result<SetupStatus> {
  const parsed = setupSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' } };
  }
  const { companyName, address, phone, email, admin } = parsed.data;

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE settings SET company_name = ?, address = ?, phone = ?, email = ?,
         setup_completed_at = COALESCE(setup_completed_at, datetime('now')), updated_date = datetime('now') WHERE id = 1`
    ).run(companyName, address || null, phone || null, email || null);

    if (admin) {
      // Only replace the factory-default admin, and only while it still has the factory
      // password — never clobber credentials an existing shop already chose.
      const row = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(DEFAULT_ADMIN_EMAIL) as
        | { id: number; password_hash: string } | undefined;
      if (row && bcrypt.compareSync(DEFAULT_ADMIN_PASSWORD, row.password_hash)) {
        db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?')
          .run(admin.email, bcrypt.hashSync(admin.password, 10), row.id);
      }
    }
  });

  try {
    run();
  } catch (err: any) {
    const taken = /UNIQUE/i.test(err?.message ?? '');
    return { ok: false, error: { code: taken ? 'EMAIL_TAKEN' : 'SETUP_FAILED', message: taken ? 'That admin email is already in use.' : 'Could not save setup.' } };
  }
  return getStatus(db);
}
