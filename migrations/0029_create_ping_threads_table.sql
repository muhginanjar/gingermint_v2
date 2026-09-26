-- 0029 — Pings (direct / small-group conversations).
CREATE TABLE IF NOT EXISTS ping_threads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
