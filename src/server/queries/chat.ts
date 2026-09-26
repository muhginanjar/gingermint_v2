/** Project chat (Campfire) and Pings. */
import { db } from "../db";

export interface ChatLineRow {
	id: number;
	projectId: number;
	authorId: number | null;
	body: string;
	attachmentId: string | null;
	createdAt: string;
}
const CHAT_COLS = `id, project_id AS projectId, author_id AS authorId, body, attachment_id AS attachmentId, created_at AS createdAt`;

export const listRecentChatLines = db.query<ChatLineRow, [number, number]>(
	`SELECT * FROM (SELECT ${CHAT_COLS} FROM chat_lines WHERE project_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id`,
);
export const listChatLinesAfter = db.query<ChatLineRow, [number, number]>(
	`SELECT ${CHAT_COLS} FROM chat_lines WHERE project_id = ? AND id > ? ORDER BY id LIMIT 200`,
);
export const listChatLinesBefore = db.query<ChatLineRow, [number, number, number]>(
	`SELECT * FROM (SELECT ${CHAT_COLS} FROM chat_lines WHERE project_id = ? AND id < ? ORDER BY id DESC LIMIT ?) ORDER BY id`,
);
export const findChatLine = db.query<ChatLineRow, [number]>(
	`SELECT ${CHAT_COLS} FROM chat_lines WHERE id = ?`,
);
export const insertChatLine = db.query<{ id: number }, [number, number, string, string | null]>(
	`INSERT INTO chat_lines (project_id, author_id, body, attachment_id) VALUES (?, ?, ?, ?) RETURNING id`,
);
export const deleteChatLine = db.query<null, [number]>(`DELETE FROM chat_lines WHERE id = ?`);

// Pings ---------------------------------------------------------------------------

export interface PingThreadRow {
	id: number;
	updatedAt: string;
	lastReadId: number;
}
export const listPingThreads = db.query<PingThreadRow, [number, number]>(
	`SELECT t.id, t.updated_at AS updatedAt, pp.last_read_id AS lastReadId
   FROM ping_threads t JOIN ping_participants pp ON pp.thread_id = t.id AND pp.user_id = ?1
   WHERE t.account_id = ?2 AND EXISTS (SELECT 1 FROM ping_messages m WHERE m.thread_id = t.id)
   ORDER BY t.updated_at DESC`,
);
export const findPingThreadFor = db.query<PingThreadRow, [number, number, number]>(
	`SELECT t.id, t.updated_at AS updatedAt, pp.last_read_id AS lastReadId
   FROM ping_threads t JOIN ping_participants pp ON pp.thread_id = t.id AND pp.user_id = ?2
   WHERE t.id = ?1 AND t.account_id = ?3`,
);
export const listPingParticipants = db.query<{ threadId: number; userId: number }, [string]>(
	`SELECT thread_id AS threadId, user_id AS userId FROM ping_participants WHERE thread_id IN (SELECT value FROM json_each(?))`,
);
/** Find an existing thread whose participant set is exactly the given ids. */
export const findThreadByParticipants = db.query<{ id: number }, [string, number, number]>(
	`SELECT pp.thread_id AS id FROM ping_participants pp
   JOIN ping_threads t ON t.id = pp.thread_id AND t.account_id = ?3
   GROUP BY pp.thread_id
   HAVING COUNT(*) = ?2
     AND SUM(CASE WHEN pp.user_id IN (SELECT value FROM json_each(?1)) THEN 1 ELSE 0 END) = ?2
   LIMIT 1`,
);
export const insertPingThread = db.query<{ id: number }, [number, number]>(
	`INSERT INTO ping_threads (created_by, account_id) VALUES (?, ?) RETURNING id`,
);
export const addPingParticipant = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO ping_participants (thread_id, user_id) VALUES (?, ?)`,
);
export const touchPingThread = db.query<null, [string, number]>(
	`UPDATE ping_threads SET updated_at = ? WHERE id = ?`,
);
export const markPingRead = db.query<null, [number, number, number]>(
	`UPDATE ping_participants SET last_read_id = ? WHERE thread_id = ? AND user_id = ?`,
);

export interface PingMessageRow {
	id: number;
	threadId: number;
	authorId: number | null;
	body: string;
	attachmentId: string | null;
	createdAt: string;
}
const PM_COLS = `id, thread_id AS threadId, author_id AS authorId, body, attachment_id AS attachmentId, created_at AS createdAt`;
export const listPingMessages = db.query<PingMessageRow, [number]>(
	`SELECT * FROM (SELECT ${PM_COLS} FROM ping_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 200) ORDER BY id`,
);
export const listPingMessagesAfter = db.query<PingMessageRow, [number, number]>(
	`SELECT ${PM_COLS} FROM ping_messages WHERE thread_id = ? AND id > ? ORDER BY id`,
);
export const lastPingMessage = db.query<PingMessageRow & { authorName: string | null }, [number]>(
	`SELECT m.id, m.thread_id AS threadId, m.author_id AS authorId, m.body, m.attachment_id AS attachmentId,
     m.created_at AS createdAt, u.name AS authorName
   FROM ping_messages m LEFT JOIN users u ON u.id = m.author_id WHERE m.thread_id = ? ORDER BY m.id DESC LIMIT 1`,
);
export const countPingUnread = db.query<{ n: number }, [number, number, number]>(
	`SELECT COUNT(*) AS n FROM ping_messages WHERE thread_id = ? AND id > ? AND author_id != ?`,
);
export const totalPingUnread = db.query<{ n: number }, [number, number]>(
	`SELECT COUNT(*) AS n FROM ping_messages m
   JOIN ping_participants pp ON pp.thread_id = m.thread_id AND pp.user_id = ?1
   JOIN ping_threads t ON t.id = m.thread_id AND t.account_id = ?2
   WHERE m.id > pp.last_read_id AND m.author_id != ?1`,
);
export const insertPingMessage = db.query<{ id: number }, [number, number, string, string | null]>(
	`INSERT INTO ping_messages (thread_id, author_id, body, attachment_id) VALUES (?, ?, ?, ?) RETURNING id`,
);
