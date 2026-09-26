-- 0054 — an API token acts inside one workspace.
ALTER TABLE api_tokens ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
