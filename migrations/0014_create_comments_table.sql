-- 0014 — comments on any recordable (message, todo, card, doc, file, event, checkin_answer).
CREATE TABLE IF NOT EXISTS comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recordable_type TEXT    NOT NULL,
  recordable_id   INTEGER NOT NULL,
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body            TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_recordable ON comments(recordable_type, recordable_id);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id, created_at);
