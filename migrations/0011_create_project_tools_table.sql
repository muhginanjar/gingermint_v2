-- 0011 — tools enabled on a project's toolbox page.
-- kind: message_board | todos | docs | schedule | chat | card_table | checkins | timesheet
CREATE TABLE IF NOT EXISTS project_tools (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, kind)
);
