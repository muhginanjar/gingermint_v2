-- 0009 — projects (a.k.a. "teams"/"HQ" in Basecamp). access = 'all' makes the
-- project visible to everyone in the account ("All-access" badge).
CREATE TABLE IF NOT EXISTS projects (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  icon          TEXT    NOT NULL DEFAULT '',
  color         TEXT    NOT NULL DEFAULT 'blue',
  logo_url      TEXT,
  folder_id     INTEGER REFERENCES folders(id) ON DELETE SET NULL,
  lead_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  phase         TEXT    NOT NULL DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'on_track',
  start_on      TEXT,
  end_on        TEXT,
  access        TEXT    NOT NULL DEFAULT 'invite',
  is_template   INTEGER NOT NULL DEFAULT 0,
  inbound_token TEXT    NOT NULL,
  archived_at   TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_inbound ON projects(inbound_token);
