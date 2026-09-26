-- 0048 — Home folders are per workspace.
ALTER TABLE folders ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_folders_account ON folders(account_id);
