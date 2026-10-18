import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { Result, SessionUser } from '../../shared/types';
import { UserRole } from '../../shared/constants';
import { loginSchema } from '../../shared/schemas';

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: UserRole;
  is_active: number;
  last_login_at: string | null;
}

const DEFAULT_ADMIN_EMAIL = 'admin@fazalhardware.local';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

// Seeds a single admin user the first time the app runs against an empty DB.
// Proper first-run setup UX (letting the shop owner pick their own
// email/password) is deferred to Phase 13 Task 13.4 — this exists so Task 1.3
// has something to log in with today.
export function ensureDefaultAdmin(db: Database.Database): void {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count > 0) return;

  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
  db.prepare(
    `INSERT INTO users (email, password_hash, full_name, role, is_active)
     VALUES (?, ?, 'Admin', 'admin', 1)`
  ).run(DEFAULT_ADMIN_EMAIL, passwordHash);
}

export function login(db: Database.Database, payload: unknown): Result<SessionUser> {
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0]?.message ?? 'Invalid input' },
    };
  }
  const { email, password } = parsed.data;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!user || !user.is_active) {
    return { ok: false, error: { code: 'AUTH_INVALID', message: 'Invalid email or password' } };
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return { ok: false, error: { code: 'AUTH_INVALID', message: 'Invalid email or password' } };
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };
  return { ok: true, data: sessionUser };
}
