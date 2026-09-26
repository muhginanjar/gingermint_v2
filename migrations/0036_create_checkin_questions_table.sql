-- 0036 — Automatic Check-ins. frequency: daily | weekly | biweekly | monthly.
-- days = comma-separated weekday numbers (0 = Sunday), time_of_day = HH:MM.
CREATE TABLE IF NOT EXISTS checkin_questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question      TEXT    NOT NULL,
  frequency     TEXT    NOT NULL DEFAULT 'weekly',
  days          TEXT    NOT NULL DEFAULT '1',
  time_of_day   TEXT    NOT NULL DEFAULT '09:00',
  paused        INTEGER NOT NULL DEFAULT 0,
  last_asked_on TEXT,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
