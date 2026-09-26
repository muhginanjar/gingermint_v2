-- 0032 — "New for you" notifications. bubble_up_at (future) hides the row
-- until that moment, then it resurfaces as unread (Bubble Up).
CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  kind         TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  excerpt      TEXT    NOT NULL DEFAULT '',
  url          TEXT    NOT NULL,
  project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  read_at      TEXT,
  bubble_up_at TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
