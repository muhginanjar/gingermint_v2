-- 0039 — Hill Chart position history for tracked to-do lists.
CREATE TABLE IF NOT EXISTS hill_updates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  list_id    INTEGER NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  position   REAL    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_hill_updates_project ON hill_updates(project_id, created_at);
