-- 0025 — Docs & Files. kind: folder | doc | file | link.
CREATE TABLE IF NOT EXISTS vault_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id      INTEGER REFERENCES vault_items(id) ON DELETE CASCADE,
  kind           TEXT    NOT NULL,
  title          TEXT    NOT NULL,
  body           TEXT    NOT NULL DEFAULT '',
  color          TEXT    NOT NULL DEFAULT 'blue',
  url            TEXT,
  description    TEXT    NOT NULL DEFAULT '',
  image_url      TEXT,
  attachment_id  TEXT    REFERENCES attachments(id) ON DELETE SET NULL,
  client_visible INTEGER NOT NULL DEFAULT 0,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_vault_items_parent ON vault_items(project_id, parent_id);
