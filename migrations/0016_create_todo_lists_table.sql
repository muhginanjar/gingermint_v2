-- 0016 — to-do lists. hill_tracked/hill_position power Hill Charts.
CREATE TABLE IF NOT EXISTS todo_lists (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  description    TEXT    NOT NULL DEFAULT '',
  position       REAL    NOT NULL DEFAULT 0,
  client_visible INTEGER NOT NULL DEFAULT 0,
  hill_tracked   INTEGER NOT NULL DEFAULT 0,
  hill_position  REAL    NOT NULL DEFAULT 0,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_todo_lists_project ON todo_lists(project_id, position);
