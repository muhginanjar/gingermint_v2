-- 0028 — project Chat (Campfire) lines.
CREATE TABLE IF NOT EXISTS chat_lines (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body          TEXT    NOT NULL DEFAULT '',
  attachment_id TEXT    REFERENCES attachments(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_lines_project ON chat_lines(project_id, id);
