-- 0007 — account-wide key/value settings (account name, logo) for Adminland.
CREATE TABLE IF NOT EXISTS account_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO account_settings (key, value) VALUES ('name', 'GingerMint');
