-- 0052 — bookmarks are listed per workspace.
ALTER TABLE bookmarks ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
