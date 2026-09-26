-- 0030 — ping participants; last_read_id tracks unread state.
CREATE TABLE IF NOT EXISTS ping_participants (
  thread_id    INTEGER NOT NULL REFERENCES ping_threads(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ping_participants_user ON ping_participants(user_id);
