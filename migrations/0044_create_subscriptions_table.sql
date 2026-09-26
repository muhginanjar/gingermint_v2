-- 0044 — who gets notified about new comments on a recordable.
CREATE TABLE IF NOT EXISTS subscriptions (
  recordable_type TEXT    NOT NULL,
  recordable_id   INTEGER NOT NULL,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (recordable_type, recordable_id, user_id)
);
