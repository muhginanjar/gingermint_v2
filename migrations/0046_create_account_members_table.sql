-- 0046 — who belongs to which workspace, with a per-workspace role:
-- admin | member | client (clients only see projects they were added to).
CREATE TABLE IF NOT EXISTS account_members (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL DEFAULT 'member',
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_account_members_user ON account_members(user_id);

-- Everyone who already exists joins workspace 1 with their old global role.
INSERT OR IGNORE INTO account_members (account_id, user_id, role)
SELECT 1, id, CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END FROM users;

-- People who are only ever clients on projects stay clients in the workspace.
UPDATE account_members SET role = 'client'
WHERE account_id = 1 AND role = 'member' AND user_id IN (
  SELECT user_id FROM project_members GROUP BY user_id HAVING SUM(role != 'client') = 0
);
