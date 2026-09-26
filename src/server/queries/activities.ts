/** Activity timeline rows. Scoped by full/client project id lists (JSON arrays). */
import { db } from "../db";

export interface ActivityRow {
	id: number;
	projectId: number | null;
	projectName: string | null;
	actorId: number | null;
	action: string;
	recordableType: string;
	recordableId: number;
	title: string;
	excerpt: string;
	url: string;
	createdAt: string;
}
const COLS = `a.id, a.project_id AS projectId, p.name AS projectName, a.actor_id AS actorId, a.action,
  a.recordable_type AS recordableType, a.recordable_id AS recordableId, a.title, a.excerpt, a.url, a.created_at AS createdAt`;
const SCOPE = `(a.project_id IN (SELECT value FROM json_each(?1))
  OR (a.project_id IN (SELECT value FROM json_each(?2)) AND a.client_visible = 1))`;

export const insertActivity = db.query<
	{ id: number },
	[number | null, number | null, string, string, number, string, string, string, number]
>(
	`INSERT INTO activities (project_id, actor_id, action, recordable_type, recordable_id, title, excerpt, url, client_visible)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);

/** Timeline page: filter by optional project (?3, 0 = all) and actor (?4, 0 = everyone), before cursor ?5. */
export const listActivities = db.query<ActivityRow, [string, string, number, number, string, number]>(
	`SELECT ${COLS} FROM activities a LEFT JOIN projects p ON p.id = a.project_id
   WHERE ${SCOPE} AND (?3 = 0 OR a.project_id = ?3) AND (?4 = 0 OR a.actor_id = ?4) AND a.created_at < ?5
   ORDER BY a.created_at DESC, a.id DESC LIMIT ?6`,
);

/** Activities in a date window (Wrap-up). */
export const listActivitiesBetween = db.query<ActivityRow, [string, string, string, string, number]>(
	`SELECT ${COLS} FROM activities a LEFT JOIN projects p ON p.id = a.project_id
   WHERE ${SCOPE} AND a.created_at >= ?3 AND a.created_at < ?4 AND (?5 = 0 OR a.project_id = ?5)
   ORDER BY a.created_at DESC`,
);

export const deleteActivitiesFor = db.query<null, [string, number]>(
	`DELETE FROM activities WHERE recordable_type = ? AND recordable_id = ?`,
);
