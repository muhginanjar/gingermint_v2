-- 0015 — emoji reactions ("boosts") on chat lines, comments, messages, pings.
CREATE TABLE IF NOT EXISTS reactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  recordable_type TEXT    NOT NULL,
  recordable_id   INTEGER NOT NULL,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji           TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (recordable_type, recordable_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_reactions_recordable ON reactions(recordable_type, recordable_id);
