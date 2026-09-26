-- 0006 — profile fields used across the workspace (title shown under names,
-- calendar_token for the private ICS subscription feed, last_seen_at for
-- "N people active in the last 24 hours").
ALTER TABLE users ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN calendar_token TEXT;
ALTER TABLE users ADD COLUMN last_seen_at TEXT;
