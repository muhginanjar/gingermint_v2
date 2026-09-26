/** "New for you" notifications, bookmarks, My Notes, recently visited. */
import { db } from "../db";

export interface NotificationRow {
	id: number;
	userId: number;
	actorId: number | null;
	kind: string;
	title: string;
	excerpt: string;
	url: string;
	projectName: string | null;
	readAt: string | null;
	bubbleUpAt: string | null;
	createdAt: string;
}
const COLS = `n.id, n.user_id AS userId, n.actor_id AS actorId, n.kind, n.title, n.excerpt, n.url,
  p.name AS projectName, n.read_at AS readAt, n.bubble_up_at AS bubbleUpAt, n.created_at AS createdAt`;

/** Notifications that are visible now (not bubbled into the future), newest first. */
export const listNotifications = db.query<NotificationRow, [number, string, number, number]>(
	`SELECT ${COLS} FROM notifications n LEFT JOIN projects p ON p.id = n.project_id
   WHERE n.user_id = ?1 AND n.account_id = ?4 AND (n.bubble_up_at IS NULL OR n.bubble_up_at <= ?2)
   ORDER BY n.read_at IS NOT NULL, COALESCE(n.bubble_up_at, n.created_at) DESC LIMIT ?3`,
);
export const listBubbledUp = db.query<NotificationRow, [number, string, number]>(
	`SELECT ${COLS} FROM notifications n LEFT JOIN projects p ON p.id = n.project_id
   WHERE n.user_id = ?1 AND n.account_id = ?3 AND n.bubble_up_at > ?2 ORDER BY n.bubble_up_at`,
);
export const countUnread = db.query<{ n: number }, [number, string, number]>(
	`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?1 AND account_id = ?3 AND read_at IS NULL
     AND (bubble_up_at IS NULL OR bubble_up_at <= ?2)`,
);
/** Unread counts for every workspace the person is in (workspace switcher badges). */
export const countUnreadByAccount = db.query<{ accountId: number; n: number }, [number, string]>(
	`SELECT account_id AS accountId, COUNT(*) AS n FROM notifications WHERE user_id = ?1 AND read_at IS NULL
     AND (bubble_up_at IS NULL OR bubble_up_at <= ?2) GROUP BY account_id`,
);
export const insertNotification = db.query<
	null,
	[number, number | null, string, string, string, string, number | null, string | null, number]
>(
	`INSERT INTO notifications (user_id, actor_id, kind, title, excerpt, url, project_id, bubble_up_at, account_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
export const markNotificationRead = db.query<null, [string, number, number]>(
	`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`,
);
export const markNotificationsReadByUrl = db.query<null, [string, number, string]>(
	`UPDATE notifications SET read_at = ?1 WHERE user_id = ?2 AND read_at IS NULL
     AND (url = ?3 OR substr(url, 1, length(?3) + 1) = ?3 || '#')
     AND (bubble_up_at IS NULL OR bubble_up_at <= ?1)`,
);
export const markAllNotificationsRead = db.query<null, [string, number, number]>(
	`UPDATE notifications SET read_at = ?1 WHERE user_id = ?2 AND account_id = ?3 AND read_at IS NULL
     AND (bubble_up_at IS NULL OR bubble_up_at <= ?1)`,
);
export const bubbleUpNotification = db.query<null, [string, number, number]>(
	`UPDATE notifications SET bubble_up_at = ?, read_at = NULL WHERE id = ? AND user_id = ?`,
);
export const cancelBubbleUp = db.query<null, [number, number]>(
	`UPDATE notifications SET bubble_up_at = NULL WHERE id = ? AND user_id = ?`,
);
export const deleteNotification = db.query<null, [number, number]>(
	`DELETE FROM notifications WHERE id = ? AND user_id = ?`,
);

// Bookmarks -------------------------------------------------------------------------

export interface BookmarkRow {
	id: number;
	url: string;
	title: string;
	kind: string;
	context: string;
	createdAt: string;
}
export const listBookmarks = db.query<BookmarkRow, [number, number]>(
	`SELECT id, url, title, kind, context, created_at AS createdAt FROM bookmarks WHERE user_id = ? AND account_id = ? ORDER BY created_at DESC`,
);
export const findBookmarkByUrl = db.query<{ id: number }, [number, string]>(
	`SELECT id FROM bookmarks WHERE user_id = ? AND url = ?`,
);
export const insertBookmark = db.query<null, [number, string, string, string, string, number]>(
	`INSERT OR IGNORE INTO bookmarks (user_id, url, title, kind, context, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
);
export const deleteBookmark = db.query<null, [number, number]>(
	`DELETE FROM bookmarks WHERE id = ? AND user_id = ?`,
);

// My Notes ------------------------------------------------------------------------------

export const findNote = db.query<{ body: string; updatedAt: string }, [number]>(
	`SELECT body, updated_at AS updatedAt FROM user_notes WHERE user_id = ?`,
);
export const upsertNote = db.query<null, [number, string, string]>(
	`INSERT INTO user_notes (user_id, body, updated_at) VALUES (?, ?, ?)
   ON CONFLICT(user_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
);

// Recently visited ---------------------------------------------------------------------------

export const upsertVisit = db.query<null, [number, string, string, string, string, string, number]>(
	`INSERT INTO visits (user_id, url, title, kind, context, visited_at, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(user_id, url) DO UPDATE SET title = excluded.title, kind = excluded.kind,
     context = excluded.context, visited_at = excluded.visited_at, account_id = excluded.account_id`,
);
export const listVisits = db.query<
	{ url: string; title: string; kind: string; context: string; visitedAt: string },
	[number, number, number]
>(
	`SELECT url, title, kind, context, visited_at AS visitedAt FROM visits WHERE user_id = ? AND account_id = ? ORDER BY visited_at DESC LIMIT ?`,
);
export const pruneVisits = db.query<null, [number, number]>(
	`DELETE FROM visits WHERE user_id = ?1 AND url NOT IN
     (SELECT url FROM visits WHERE user_id = ?1 ORDER BY visited_at DESC LIMIT ?2)`,
);
