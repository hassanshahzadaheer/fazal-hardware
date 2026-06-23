-- ===== Extend audit_log with offline-first fields =====
-- The audit_log table was created in migration 0001 with basic columns.
-- This migration adds the extended columns needed for the offline-first sync infrastructure.
-- SQLite ALTER TABLE only supports adding columns (no IF NOT EXISTS guard),
-- so we use a try-safe pattern: the migration runner will skip if already applied.

ALTER TABLE audit_log ADD COLUMN old_values JSON;
ALTER TABLE audit_log ADD COLUMN new_values JSON;
ALTER TABLE audit_log ADD COLUMN ip_address TEXT;
ALTER TABLE audit_log ADD COLUMN offline INTEGER DEFAULT 0;
ALTER TABLE audit_log ADD COLUMN synced_at TEXT;

-- Rename entity -> entity_type via new view is not possible in SQLite easily.
-- Add a generated alias column that mirrors the existing 'entity' column.
-- Frontend/handler code should use 'entity' (original column name).
-- This column serves as an indexed alias for the entity table name.
ALTER TABLE audit_log ADD COLUMN entity_type TEXT;

-- Backfill entity_type from entity for existing rows
UPDATE audit_log SET entity_type = entity WHERE entity_type IS NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
