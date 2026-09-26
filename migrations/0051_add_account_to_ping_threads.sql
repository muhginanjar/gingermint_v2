-- 0051 — Pings live inside a workspace.
ALTER TABLE ping_threads ADD COLUMN account_id INTEGER NOT NULL DEFAULT 1;
