-- 0017 — to-dos. list_id NULL = Loose To-do; parent_id NOT NULL = subtask.
CREATE TABLE IF NOT EXISTS todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  list_id      INTEGER REFERENCES todo_lists(id) ON DELETE CASCADE,
  parent_id    INTEGER REFERENCES todos(id) ON DELETE CASCADE,
  title        TEXT    NOT NULL,
  notes        TEXT    NOT NULL DEFAULT '',
  due_on       TEXT,
  position     REAL    NOT NULL DEFAULT 0,
  completed_at TEXT,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id, list_id, position);
CREATE INDEX IF NOT EXISTS idx_todos_parent ON todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_due ON todos(due_on) WHERE completed_at IS NULL;
