import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import log from 'electron-log';
import { ensureDefaultAdmin } from '../handlers/auth';

let db: Database.Database | null = null;

export function getDbPath(customPath?: string): string {
  if (customPath) return customPath;
  
  // In test environment (where Electron app is not available), fallback to a test database or memory
  let userDataPath: string;
  try {
    userDataPath = app.getPath('userData');
  } catch (err) {
    userDataPath = path.resolve(__dirname, '../../test-data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
  }
  return path.join(userDataPath, 'fazal.db');
}

export function initDb(customPath?: string): Database.Database {
  if (db && !customPath) return db;

  const dbPath = getDbPath(customPath);
  log.info(`Opening SQLite database at: ${dbPath}`);

  const activeDb = new Database(dbPath, { verbose: (msg) => log.debug(msg) });
  
  // Enable WAL and Foreign Keys
  activeDb.pragma('journal_mode = WAL');
  activeDb.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(activeDb);

  // Fail fast and clearly if this file predates the Phase 0 schema reset, instead
  // of letting a cryptic "no such column" surface deep inside some later query.
  assertCompatibleSchema(activeDb, dbPath);

  // First-run convenience: seed one admin user if the table is empty (Task 1.3).
  ensureDefaultAdmin(activeDb);

  if (!customPath) {
    db = activeDb;
  }
  return activeDb;
}

export function getDb(): Database.Database {
  if (!db) {
    return initDb();
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    log.info('Database connection closed.');
  }
}

export function resolveMigrationsDir(candidates = getMigrationDirCandidates()): string {
  const migrationsDir = candidates.find(candidate => fs.existsSync(candidate));
  if (!migrationsDir) {
    throw new Error(`Database migrations directory not found. Checked: ${candidates.join(', ')}`);
  }
  return migrationsDir;
}

// Migration version numbers restarted from 1 during the Phase 0 schema reset
// (docs/IMPLEMENTATION_PLAN.md), which is intentionally incompatible with
// whatever came before. If an existing DB file already has migration history
// but lacks a marker column from the new schema, the migration runner above
// silently skips re-applying "already applied" versions — so catch that case
// explicitly here rather than letting it surface as a cryptic SQL error later.
function assertCompatibleSchema(activeDb: Database.Database, dbPath: string): void {
  const hasMigrationHistory = activeDb.prepare('SELECT 1 FROM schema_migrations LIMIT 1').get();
  if (!hasMigrationHistory) return; // brand-new DB, nothing to check

  const usersTableExists = activeDb
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  const columns = usersTableExists
    ? (activeDb.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name)
    : [];

  if (!columns.includes('email')) {
    throw new Error(
      `Incompatible database at ${dbPath}: this file has migration history recorded but no ` +
        `'users.email' column, so it predates the Phase 0 schema reset and cannot be auto-migrated. ` +
        `Delete or move this file aside and relaunch to start with a fresh database — no historical ` +
        `data migration from the old schema is planned (see docs/IMPLEMENTATION_PLAN.md).`
    );
  }
}

function getMigrationDirCandidates(): string[] {
  return [
    path.resolve(__dirname, './migrations'),
    path.resolve(__dirname, './db/migrations'),
  ];
}

function runMigrations(activeDb: Database.Database): void {
  // Find migration files. Source tests run from electron/db, while the bundled
  // main process runs from dist-electron and stores migrations under db/.
  const migrationsDir = resolveMigrationsDir();
  log.info(`Searching for database migrations in: ${migrationsDir}`);

  // Ensure schema_migrations exists
  activeDb.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `).run();

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;

    const version = parseInt(versionMatch[1], 10);
    
    // Check if migration is already applied
    const row = activeDb.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version);
    if (row) {
      log.debug(`Migration ${file} already applied.`);
      continue;
    }

    log.info(`Applying migration: ${file}`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Run migration in transaction
    const runMigrationTx = activeDb.transaction(() => {
      // Split commands by semicolon, but handle multi-line triggers/statements properly
      // A simple split on ';' followed by newline is robust for standard migrations
      const queries = sqlContent
        .split(/;\s*$/m)
        .map(q => q.trim())
        .filter(q => q.length > 0);

      for (const query of queries) {
        activeDb.prepare(query).run();
      }

      // Record migration
      activeDb.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime('now'))")
        .run(version);
    });

    try {
      runMigrationTx();
      log.info(`Migration ${file} applied successfully.`);
    } catch (err) {
      log.error(`Failed to apply migration ${file}:`, err);
      throw err;
    }
  }
}
