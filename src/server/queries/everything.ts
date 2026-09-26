/**
 * Cross-project reads: universal search, Everything views, and reports.
 * Scope params are JSON arrays of project ids:
 *   ?1 = projects with full access, ?2 = projects where the viewer is a client
 *   (clients only see rows flagged client_visible).
 * Text filters use LIKE with '\' as the escape char (see services/search.ts).
 */
import { db } from "../db";

const scope = (alias: string, clientFlag = true) =>
	clientFlag
		? `(${alias}.project_id IN (SELECT value FROM json_each(?1))
        OR (${alias}.project_id IN (SELECT value FROM json_each(?2)) AND ${alias}.client_visible = 1))`
		: `(${alias}.project_id IN (SELECT value FROM json_each(?1)) AND ?2 IS NOT NULL)`;

export interface SearchRow {
	kind: string;
	id: number;
	title: string;
	body: string;
	projectId: number | null;
	context: string;
	parentType: string | null;
	parentId: number | null;
	createdAt: string;
}

const LIKE = (col: string) => `${col} LIKE ?3 ESCAPE '\\'`;

export const searchAll = db.query<SearchRow, [string, string, string, number]>(`
SELECT * FROM (
  SELECT 'project' AS kind, p.id, p.name AS title, p.description AS body, p.id AS projectId, 'Project' AS context,
    NULL AS parentType, NULL AS parentId, p.updated_at AS createdAt
  FROM projects p WHERE p.is_template = 0 AND p.archived_at IS NULL
    AND (p.id IN (SELECT value FROM json_each(?1)) OR p.id IN (SELECT value FROM json_each(?2)))
    AND (${LIKE("p.name")} OR ${LIKE("p.description")})
  UNION ALL
  SELECT 'message', m.id, m.title, m.body, m.project_id, p.name, NULL, NULL, m.created_at
  FROM messages m JOIN projects p ON p.id = m.project_id
  WHERE ${scope("m")} AND (${LIKE("m.title")} OR ${LIKE("m.body")})
  UNION ALL
  SELECT 'todo', t.id, t.title, t.notes, t.project_id, p.name, NULL, NULL, t.created_at
  FROM todos t JOIN projects p ON p.id = t.project_id LEFT JOIN todo_lists l ON l.id = t.list_id
  WHERE (t.project_id IN (SELECT value FROM json_each(?1))
         OR (t.project_id IN (SELECT value FROM json_each(?2)) AND l.client_visible = 1))
    AND (${LIKE("t.title")} OR ${LIKE("t.notes")})
  UNION ALL
  SELECT 'card', c.id, c.title, c.body, c.project_id, p.name, NULL, NULL, c.created_at
  FROM cards c JOIN projects p ON p.id = c.project_id
  WHERE c.project_id IN (SELECT value FROM json_each(?1)) AND (${LIKE("c.title")} OR ${LIKE("c.body")})
  UNION ALL
  SELECT v.kind, v.id, v.title, v.body || ' ' || v.description, v.project_id, p.name, NULL, NULL, v.created_at
  FROM vault_items v JOIN projects p ON p.id = v.project_id
  WHERE ${scope("v")} AND (${LIKE("v.title")} OR ${LIKE("v.body")} OR ${LIKE("v.description")})
  UNION ALL
  SELECT 'event', e.id, e.title, e.notes, e.project_id, p.name, NULL, NULL, e.starts_at
  FROM events e JOIN projects p ON p.id = e.project_id
  WHERE ${scope("e")} AND (${LIKE("e.title")} OR ${LIKE("e.notes")})
  UNION ALL
  SELECT 'comment', c.id, '', c.body, c.project_id, p.name, c.recordable_type, c.recordable_id, c.created_at
  FROM comments c JOIN projects p ON p.id = c.project_id
  WHERE c.project_id IN (SELECT value FROM json_each(?1)) AND ${LIKE("c.body")}
  UNION ALL
  SELECT 'chat_line', c.id, '', c.body, c.project_id, p.name, NULL, NULL, c.created_at
  FROM chat_lines c JOIN projects p ON p.id = c.project_id
  WHERE c.project_id IN (SELECT value FROM json_each(?1)) AND ${LIKE("c.body")}
  UNION ALL
  SELECT 'checkin_answer', a.id, q.question, a.body, a.project_id, p.name, NULL, a.question_id, a.created_at
  FROM checkin_answers a JOIN checkin_questions q ON q.id = a.question_id JOIN projects p ON p.id = a.project_id
  WHERE a.project_id IN (SELECT value FROM json_each(?1)) AND ${LIKE("a.body")}
) ORDER BY createdAt DESC LIMIT ?4`);

// Everything views ----------------------------------------------------------------

export interface EverythingRow {
	id: number;
	projectId: number;
	projectName: string;
	authorId: number | null;
	title: string;
	body: string;
	kind: string;
	parentType: string | null;
	parentId: number | null;
	createdAt: string;
}

export const everythingMessages = db.query<EverythingRow, [string, string, string, number]>(
	`SELECT m.id, m.project_id AS projectId, p.name AS projectName, m.author_id AS authorId, m.title, m.body,
     'message' AS kind, NULL AS parentType, NULL AS parentId, m.created_at AS createdAt
   FROM messages m JOIN projects p ON p.id = m.project_id
   WHERE ${scope("m")} AND p.archived_at IS NULL AND (${LIKE("m.title")} OR ${LIKE("m.body")})
   ORDER BY m.created_at DESC LIMIT ?4`,
);
export const everythingFiles = db.query<EverythingRow, [string, string, string, number]>(
	`SELECT v.id, v.project_id AS projectId, p.name AS projectName, v.created_by AS authorId, v.title,
     v.description AS body, v.kind, v.attachment_id AS parentType, v.parent_id AS parentId, v.updated_at AS createdAt
   FROM vault_items v JOIN projects p ON p.id = v.project_id
   WHERE ${scope("v")} AND v.kind != 'folder' AND p.archived_at IS NULL AND ${LIKE("v.title")}
   ORDER BY v.updated_at DESC LIMIT ?4`,
);
export const everythingComments = db.query<EverythingRow, [string, string, string, number]>(
	`SELECT c.id, c.project_id AS projectId, p.name AS projectName, c.author_id AS authorId, '' AS title, c.body,
     'comment' AS kind, c.recordable_type AS parentType, c.recordable_id AS parentId, c.created_at AS createdAt
   FROM comments c JOIN projects p ON p.id = c.project_id
   WHERE c.project_id IN (SELECT value FROM json_each(?1)) AND ?2 IS NOT NULL AND p.archived_at IS NULL
     AND ${LIKE("c.body")}
   ORDER BY c.created_at DESC LIMIT ?4`,
);
export const everythingCheckins = db.query<EverythingRow, [string, string, string, number]>(
	`SELECT a.id, a.project_id AS projectId, p.name AS projectName, a.author_id AS authorId, q.question AS title, a.body,
     'checkin_answer' AS kind, 'checkin_question' AS parentType, a.question_id AS parentId, a.created_at AS createdAt
   FROM checkin_answers a JOIN checkin_questions q ON q.id = a.question_id JOIN projects p ON p.id = a.project_id
   WHERE a.project_id IN (SELECT value FROM json_each(?1)) AND ?2 IS NOT NULL AND p.archived_at IS NULL
     AND (${LIKE("a.body")} OR ${LIKE("q.question")})
   ORDER BY a.created_at DESC LIMIT ?4`,
);
export const everythingForwards = db.query<EverythingRow, [string, string, string, number]>(
	`SELECT f.id, f.project_id AS projectId, p.name AS projectName, NULL AS authorId, f.subject AS title, f.body,
     'forward' AS kind, f.from_addr AS parentType, NULL AS parentId, f.created_at AS createdAt
   FROM forwards f JOIN projects p ON p.id = f.project_id
   WHERE f.project_id IN (SELECT value FROM json_each(?1)) AND ?2 IS NOT NULL AND p.archived_at IS NULL
     AND (${LIKE("f.subject")} OR ${LIKE("f.body")})
   ORDER BY f.created_at DESC LIMIT ?4`,
);

// Reports ---------------------------------------------------------------------------

export interface OverdueRow {
	id: number;
	kind: string;
	title: string;
	dueOn: string;
	projectId: number;
	projectName: string;
}
export const overdueItems = db.query<OverdueRow, [string, string]>(
	`SELECT t.id, 'todo' AS kind, t.title, t.due_on AS dueOn, t.project_id AS projectId, p.name AS projectName
   FROM todos t JOIN projects p ON p.id = t.project_id
   WHERE t.completed_at IS NULL AND t.due_on < ?1 AND p.archived_at IS NULL
     AND t.project_id IN (SELECT value FROM json_each(?2))
   UNION ALL
   SELECT c.id, 'card', c.title, c.due_on, c.project_id, p.name
   FROM cards c JOIN projects p ON p.id = c.project_id JOIN card_columns k ON k.id = c.column_id
   WHERE k.kind NOT IN ('done', 'not_now') AND c.due_on < ?1 AND p.archived_at IS NULL
     AND c.project_id IN (SELECT value FROM json_each(?2))
   ORDER BY dueOn`,
);
export const overdueAssignees = db.query<{ todoId: number; userId: number }, [string]>(
	`SELECT todo_id AS todoId, user_id AS userId FROM todo_assignees WHERE todo_id IN (SELECT value FROM json_each(?))`,
);

export const openAssignmentsByPerson = db.query<
	{ userId: number; open: number; overdue: number; dueSoon: number },
	[string, string, string]
>(
	`SELECT a.user_id AS userId, COUNT(*) AS open,
     SUM(CASE WHEN t.due_on < ?1 THEN 1 ELSE 0 END) AS overdue,
     SUM(CASE WHEN t.due_on BETWEEN ?1 AND ?2 THEN 1 ELSE 0 END) AS dueSoon
   FROM todo_assignees a JOIN todos t ON t.id = a.todo_id JOIN projects p ON p.id = t.project_id
   WHERE t.completed_at IS NULL AND p.archived_at IS NULL AND t.project_id IN (SELECT value FROM json_each(?3))
   GROUP BY a.user_id`,
);

export const completedBetween = db.query<{ n: number }, [string, string, string]>(
	`SELECT COUNT(*) AS n FROM todos WHERE completed_at >= ?1 AND completed_at < ?2
     AND project_id IN (SELECT value FROM json_each(?3))`,
);
