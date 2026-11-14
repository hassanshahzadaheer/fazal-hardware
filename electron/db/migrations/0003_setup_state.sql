-- First-run setup state (Phase 3). NULL = the setup wizard has not been completed.
-- Existing installations (any user row already present) are marked complete so
-- an update never forces a live shop back through setup or touches their data.
ALTER TABLE settings ADD COLUMN setup_completed_at TEXT;
UPDATE settings SET setup_completed_at = datetime('now') WHERE id = 1 AND EXISTS (SELECT 1 FROM users)
