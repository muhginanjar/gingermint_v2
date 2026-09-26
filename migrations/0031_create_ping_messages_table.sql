-- 0031 — messages inside a ping thread.
CREATE TABLE IF NOT EXISTS ping_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id     INTEGER NOT NULL REFERENCES ping_threads(id) ON DELETE CASCADE,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body          TEXT    NOT NULL DEFAULT '',
  attachment_id TEXT    REFERENCES attachments(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_ping_messages_thread ON ping_messages(thread_id, id);
