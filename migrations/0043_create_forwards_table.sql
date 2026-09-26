-- 0043 — forwarded emails received through a project's inbound address.
CREATE TABLE IF NOT EXISTS forwards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_addr  TEXT    NOT NULL,
  subject    TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_forwards_project ON forwards(project_id, created_at);
