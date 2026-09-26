/** Schedule events + participants. */
import { db } from "../db";

export interface EventRow {
	id: number;
	projectId: number;
	projectName: string;
	projectColor: string;
	title: string;
	notes: string;
	startsAt: string;
	endsAt: string;
	allDay: number;
	videoUrl: string;
	location: string;
	clientVisible: number;
	createdBy: number | null;
	commentCount: number;
}
const COLS = `e.id, e.project_id AS projectId, p.name AS projectName, p.color AS projectColor, e.title, e.notes,
  e.starts_at AS startsAt, e.ends_at AS endsAt, e.all_day AS allDay, e.video_url AS videoUrl, e.location,
  e.client_visible AS clientVisible, e.created_by AS createdBy,
  (SELECT COUNT(*) FROM comments c WHERE c.recordable_type = 'event' AND c.recordable_id = e.id) AS commentCount`;

/** Events overlapping [from, to) in the given full/client project scopes. */
export const listEventsBetween = db.query<EventRow, [string, string, string, string]>(
	`SELECT ${COLS} FROM events e JOIN projects p ON p.id = e.project_id
   WHERE e.starts_at < ?2 AND e.ends_at >= ?1 AND p.archived_at IS NULL
     AND (e.project_id IN (SELECT value FROM json_each(?3))
          OR (e.project_id IN (SELECT value FROM json_each(?4)) AND e.client_visible = 1))
   ORDER BY e.starts_at`,
);
export const findEvent = db.query<EventRow, [number]>(
	`SELECT ${COLS} FROM events e JOIN projects p ON p.id = e.project_id WHERE e.id = ?`,
);
export const insertEvent = db.query<
	{ id: number },
	[number, string, string, string, string, number, string, string, number, number]
>(
	`INSERT INTO events (project_id, title, notes, starts_at, ends_at, all_day, video_url, location, client_visible, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateEvent = db.query<
	null,
	[string, string, string, string, number, string, string, number, string, number]
>(
	`UPDATE events SET title = ?, notes = ?, starts_at = ?, ends_at = ?, all_day = ?, video_url = ?, location = ?,
     client_visible = ?, updated_at = ? WHERE id = ?`,
);
export const deleteEvent = db.query<null, [number]>(`DELETE FROM events WHERE id = ?`);

export const listEventParticipants = db.query<{ eventId: number; userId: number }, [string]>(
	`SELECT event_id AS eventId, user_id AS userId FROM event_participants WHERE event_id IN (SELECT value FROM json_each(?))`,
);
export const clearEventParticipants = db.query<null, [number]>(
	`DELETE FROM event_participants WHERE event_id = ?`,
);
export const addEventParticipant = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO event_participants (event_id, user_id) VALUES (?, ?)`,
);
