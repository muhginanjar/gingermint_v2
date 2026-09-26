-- 0026 — Schedule events. starts_at/ends_at are ISO timestamps
-- (or YYYY-MM-DD when all_day = 1).
CREATE TABLE IF NOT EXISTS events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          TEXT    NOT NULL,
  notes          TEXT    NOT NULL DEFAULT '',
  starts_at      TEXT    NOT NULL,
  ends_at        TEXT    NOT NULL,
  all_day        INTEGER NOT NULL DEFAULT 0,
  video_url      TEXT    NOT NULL DEFAULT '',
  location       TEXT    NOT NULL DEFAULT '',
  client_visible INTEGER NOT NULL DEFAULT 0,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_events_starts ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id, starts_at);
