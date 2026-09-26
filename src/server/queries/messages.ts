/** Message Board posts. */
import { db } from "../db";

export interface MessageRow {
	id: number;
	projectId: number;
	authorId: number | null;
	title: string;
	body: string;
	category: string;
	pinned: number;
	clientVisible: number;
	createdAt: string;
	updatedAt: string;
	commentCount: number;
}

const COLS = `m.id, m.project_id AS projectId, m.author_id AS authorId, m.title, m.body, m.category,
  m.pinned, m.client_visible AS clientVisible, m.created_at AS createdAt, m.updated_at AS updatedAt,
  (SELECT COUNT(*) FROM comments c WHERE c.recordable_type = 'message' AND c.recordable_id = m.id) AS commentCount`;

export const listMessages = db.query<MessageRow, [number, number]>(
	`SELECT ${COLS} FROM messages m WHERE m.project_id = ?1 AND (?2 = 0 OR m.client_visible = 1)
   ORDER BY m.pinned DESC, m.created_at DESC`,
);
export const findMessage = db.query<MessageRow, [number]>(
	`SELECT ${COLS} FROM messages m WHERE m.id = ?`,
);
export const insertMessage = db.query<
	{ id: number },
	[number, number, string, string, string, number]
>(
	`INSERT INTO messages (project_id, author_id, title, body, category, client_visible)
   VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateMessage = db.query<null, [string, string, string, number, string, number]>(
	`UPDATE messages SET title = ?, body = ?, category = ?, client_visible = ?, updated_at = ? WHERE id = ?`,
);
export const setMessagePinned = db.query<null, [number, number]>(
	`UPDATE messages SET pinned = ? WHERE id = ?`,
);
export const deleteMessage = db.query<null, [number]>(`DELETE FROM messages WHERE id = ?`);
export const listMessageCategories = db.query<{ category: string }, [number]>(
	`SELECT DISTINCT category FROM messages WHERE project_id = ? AND category != '' ORDER BY category`,
);
