/** Comments, reactions (boosts) and comment subscriptions — polymorphic by recordable. */
import { db } from "../db";

export interface CommentRow {
	id: number;
	projectId: number;
	recordableType: string;
	recordableId: number;
	authorId: number | null;
	body: string;
	createdAt: string;
	updatedAt: string;
}

const COLS = `id, project_id AS projectId, recordable_type AS recordableType, recordable_id AS recordableId,
  author_id AS authorId, body, created_at AS createdAt, updated_at AS updatedAt`;

export const listComments = db.query<CommentRow, [string, number]>(
	`SELECT ${COLS} FROM comments WHERE recordable_type = ? AND recordable_id = ? ORDER BY created_at, id`,
);
export const findComment = db.query<CommentRow, [number]>(
	`SELECT ${COLS} FROM comments WHERE id = ?`,
);
export const insertComment = db.query<{ id: number }, [number, string, number, number, string]>(
	`INSERT INTO comments (project_id, recordable_type, recordable_id, author_id, body)
   VALUES (?, ?, ?, ?, ?) RETURNING id`,
);
export const updateComment = db.query<null, [string, string, number]>(
	`UPDATE comments SET body = ?, updated_at = ? WHERE id = ?`,
);
export const deleteComment = db.query<null, [number]>(`DELETE FROM comments WHERE id = ?`);
export const deleteCommentsFor = db.query<null, [string, number]>(
	`DELETE FROM comments WHERE recordable_type = ? AND recordable_id = ?`,
);

// Reactions -------------------------------------------------------------------

export interface ReactionRow {
	recordableId: number;
	userId: number;
	emoji: string;
	userName: string;
}
export const listReactionsFor = db.query<ReactionRow, [string, string]>(
	`SELECT r.recordable_id AS recordableId, r.user_id AS userId, r.emoji, u.name AS userName
   FROM reactions r JOIN users u ON u.id = r.user_id
   WHERE r.recordable_type = ? AND r.recordable_id IN (SELECT value FROM json_each(?))
   ORDER BY r.created_at`,
);
export const findReaction = db.query<{ id: number }, [string, number, number, string]>(
	`SELECT id FROM reactions WHERE recordable_type = ? AND recordable_id = ? AND user_id = ? AND emoji = ?`,
);
export const insertReaction = db.query<null, [string, number, number, string]>(
	`INSERT OR IGNORE INTO reactions (recordable_type, recordable_id, user_id, emoji) VALUES (?, ?, ?, ?)`,
);
export const deleteReaction = db.query<null, [number]>(`DELETE FROM reactions WHERE id = ?`);

// Subscriptions -----------------------------------------------------------------

export const subscribe = db.query<null, [string, number, number]>(
	`INSERT OR IGNORE INTO subscriptions (recordable_type, recordable_id, user_id) VALUES (?, ?, ?)`,
);
export const unsubscribe = db.query<null, [string, number, number]>(
	`DELETE FROM subscriptions WHERE recordable_type = ? AND recordable_id = ? AND user_id = ?`,
);
export const listSubscribers = db.query<{ userId: number }, [string, number]>(
	`SELECT user_id AS userId FROM subscriptions WHERE recordable_type = ? AND recordable_id = ?`,
);
