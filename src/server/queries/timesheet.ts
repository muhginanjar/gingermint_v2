/** Timesheet entries. */
import { db } from "../db";

export interface TimeEntryRow {
	id: number;
	projectId: number;
	projectName: string;
	userId: number | null;
	todoId: number | null;
	todoTitle: string | null;
	date: string;
	minutes: number;
	description: string;
}
const COLS = `e.id, e.project_id AS projectId, p.name AS projectName, e.user_id AS userId, e.todo_id AS todoId,
  t.title AS todoTitle, e.date, e.minutes, e.description`;
const FROM = `FROM time_entries e JOIN projects p ON p.id = e.project_id LEFT JOIN todos t ON t.id = e.todo_id`;

export const listProjectEntries = db.query<TimeEntryRow, [number, string, string]>(
	`SELECT ${COLS} ${FROM} WHERE e.project_id = ? AND e.date BETWEEN ? AND ? ORDER BY e.date DESC, e.id DESC`,
);
export const listEntriesBetween = db.query<TimeEntryRow, [string, string, string, number]>(
	`SELECT ${COLS} ${FROM} WHERE e.date BETWEEN ?1 AND ?2 AND e.project_id IN (SELECT value FROM json_each(?3))
     AND (?4 = 0 OR e.user_id = ?4)
   ORDER BY e.date DESC, e.id DESC`,
);
export const findEntry = db.query<TimeEntryRow, [number]>(`SELECT ${COLS} ${FROM} WHERE e.id = ?`);
export const insertEntry = db.query<{ id: number }, [number, number, number | null, string, number, string]>(
	`INSERT INTO time_entries (project_id, user_id, todo_id, date, minutes, description) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const deleteEntry = db.query<null, [number]>(`DELETE FROM time_entries WHERE id = ?`);
