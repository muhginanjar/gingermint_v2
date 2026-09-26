-- 0018 — to-do (and subtask) assignees.
CREATE TABLE IF NOT EXISTS todo_assignees (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_todo_assignees_user ON todo_assignees(user_id);
