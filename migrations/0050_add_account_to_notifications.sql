-- 0050 — notifications are shown per workspace.
ALTER TABLE notifications ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(user_id, account_id);
