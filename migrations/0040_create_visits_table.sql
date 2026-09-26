-- 0040 — "Recently visited" for the Jump menu.
CREATE TABLE IF NOT EXISTS visits (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  kind       TEXT    NOT NULL DEFAULT '',
  context    TEXT    NOT NULL DEFAULT '',
  visited_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, url)
);
CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id, visited_at);
