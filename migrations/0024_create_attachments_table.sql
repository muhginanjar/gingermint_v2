-- 0024 — uploaded files (docs & files, chat media, voice notes, logos).
-- Bytes live on disk under UPLOAD_DIR/<id>; served via /files/:id with a
-- project-membership check.
CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT    PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  filename   TEXT    NOT NULL,
  mime       TEXT    NOT NULL,
  size       INTEGER NOT NULL,
  kind       TEXT    NOT NULL DEFAULT 'file',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_attachments_project ON attachments(project_id);
