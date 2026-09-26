-- 0020 — Card Table columns. kind: triage | column | not_now | done.
CREATE TABLE IF NOT EXISTS card_columns (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  color      TEXT    NOT NULL DEFAULT 'gray',
  kind       TEXT    NOT NULL DEFAULT 'column',
  position   REAL    NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_card_columns_project ON card_columns(project_id, position);
