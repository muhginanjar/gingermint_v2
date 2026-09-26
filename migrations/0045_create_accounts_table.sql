-- 0045 — workspaces ("accounts"). Account 1 is the original single workspace;
-- its name/logo carry over from account_settings.
CREATE TABLE IF NOT EXISTS accounts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  logo_url   TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO accounts (id, name, logo_url)
SELECT 1,
  COALESCE((SELECT value FROM account_settings WHERE key = 'name' AND value != ''), 'GingerMint'),
  (SELECT NULLIF(value, '') FROM account_settings WHERE key = 'logo')
WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE id = 1);
