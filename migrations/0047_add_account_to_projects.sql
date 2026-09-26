-- 0047 — projects belong to a workspace. (ADD COLUMN can't carry a
-- REFERENCES clause with a non-NULL default; integrity is enforced in services.)
ALTER TABLE projects ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_projects_account ON projects(account_id);
