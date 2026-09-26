-- 0053 — "Recently visited" is per workspace.
ALTER TABLE visits ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
