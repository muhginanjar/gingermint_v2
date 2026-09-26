-- 0023 — steps inside a card (shown as "2/3" on the card).
CREATE TABLE IF NOT EXISTS card_steps (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title        TEXT    NOT NULL,
  assignee_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_on       TEXT,
  position     REAL    NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_card_steps_card ON card_steps(card_id, position);
