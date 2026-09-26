-- 0019 — "When done, notify these people…".
CREATE TABLE IF NOT EXISTS todo_completion_subscribers (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, user_id)
);
