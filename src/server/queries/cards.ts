/** Card Table: columns, cards, assignees, steps. */
import { db } from "../db";

export interface CardColumnRow {
	id: number;
	projectId: number;
	name: string;
	color: string;
	kind: string;
	position: number;
}
const COL_COLS = `id, project_id AS projectId, name, color, kind, position`;

export const listCardColumns = db.query<CardColumnRow, [number]>(
	`SELECT ${COL_COLS} FROM card_columns WHERE project_id = ? ORDER BY position, id`,
);
export const findCardColumn = db.query<CardColumnRow, [number]>(
	`SELECT ${COL_COLS} FROM card_columns WHERE id = ?`,
);
export const insertCardColumn = db.query<{ id: number }, [number, string, string, string, number]>(
	`INSERT INTO card_columns (project_id, name, color, kind, position) VALUES (?, ?, ?, ?, ?) RETURNING id`,
);
export const updateCardColumn = db.query<null, [string, string, number]>(
	`UPDATE card_columns SET name = ?, color = ? WHERE id = ?`,
);
export const setCardColumnPosition = db.query<null, [number, number]>(
	`UPDATE card_columns SET position = ? WHERE id = ?`,
);
export const deleteCardColumn = db.query<null, [number]>(`DELETE FROM card_columns WHERE id = ?`);
export const maxColumnPosition = db.query<{ p: number | null }, [number]>(
	`SELECT MAX(position) AS p FROM card_columns WHERE project_id = ? AND kind = 'column'`,
);

export interface CardRow {
	id: number;
	projectId: number;
	columnId: number;
	title: string;
	body: string;
	dueOn: string | null;
	position: number;
	onHold: number;
	createdBy: number | null;
	createdAt: string;
	stepsTotal: number;
	stepsDone: number;
	commentCount: number;
}
const CARD_COLS = `c.id, c.project_id AS projectId, c.column_id AS columnId, c.title, c.body, c.due_on AS dueOn,
  c.position, c.on_hold AS onHold, c.created_by AS createdBy, c.created_at AS createdAt,
  (SELECT COUNT(*) FROM card_steps s WHERE s.card_id = c.id) AS stepsTotal,
  (SELECT COUNT(*) FROM card_steps s WHERE s.card_id = c.id AND s.completed_at IS NOT NULL) AS stepsDone,
  (SELECT COUNT(*) FROM comments m WHERE m.recordable_type = 'card' AND m.recordable_id = c.id) AS commentCount`;

export const listCards = db.query<CardRow, [number]>(
	`SELECT ${CARD_COLS} FROM cards c WHERE c.project_id = ? ORDER BY c.position, c.id`,
);
export const findCard = db.query<CardRow, [number]>(`SELECT ${CARD_COLS} FROM cards c WHERE c.id = ?`);
export const insertCard = db.query<
	{ id: number },
	[number, number, string, string, string | null, number, number]
>(
	`INSERT INTO cards (project_id, column_id, title, body, due_on, position, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateCard = db.query<null, [string, string, string | null, string, number]>(
	`UPDATE cards SET title = ?, body = ?, due_on = ?, updated_at = ? WHERE id = ?`,
);
export const moveCard = db.query<null, [number, number, number, string, number]>(
	`UPDATE cards SET column_id = ?, position = ?, on_hold = ?, updated_at = ? WHERE id = ?`,
);
export const deleteCard = db.query<null, [number]>(`DELETE FROM cards WHERE id = ?`);
export const maxCardPosition = db.query<{ p: number | null }, [number]>(
	`SELECT MAX(position) AS p FROM cards WHERE column_id = ?`,
);
export const listDueCards = db.query<
	CardRow & { projectName: string; projectColor: string },
	[string, string, string]
>(
	`SELECT ${CARD_COLS}, p.name AS projectName, p.color AS projectColor FROM cards c
   JOIN projects p ON p.id = c.project_id
   JOIN card_columns k ON k.id = c.column_id
   WHERE c.due_on BETWEEN ?1 AND ?2 AND k.kind != 'done' AND p.archived_at IS NULL
     AND c.project_id IN (SELECT value FROM json_each(?3))
   ORDER BY c.due_on`,
);
export const listAssignedCards = db.query<CardRow & { projectName: string }, [number, string]>(
	`SELECT ${CARD_COLS}, p.name AS projectName FROM cards c
   JOIN card_assignees a ON a.card_id = c.id AND a.user_id = ?1
   JOIN projects p ON p.id = c.project_id
   JOIN card_columns k ON k.id = c.column_id
   WHERE k.kind NOT IN ('done', 'not_now') AND p.archived_at IS NULL
     AND c.project_id IN (SELECT value FROM json_each(?2))
   ORDER BY c.due_on IS NULL, c.due_on`,
);

export const listCardAssignees = db.query<{ cardId: number; userId: number }, [string]>(
	`SELECT card_id AS cardId, user_id AS userId FROM card_assignees WHERE card_id IN (SELECT value FROM json_each(?))`,
);
export const clearCardAssignees = db.query<null, [number]>(`DELETE FROM card_assignees WHERE card_id = ?`);
export const addCardAssignee = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO card_assignees (card_id, user_id) VALUES (?, ?)`,
);

export interface CardStepRow {
	id: number;
	cardId: number;
	title: string;
	assigneeId: number | null;
	dueOn: string | null;
	position: number;
	completedAt: string | null;
}
export const listCardSteps = db.query<CardStepRow, [number]>(
	`SELECT id, card_id AS cardId, title, assignee_id AS assigneeId, due_on AS dueOn, position, completed_at AS completedAt
   FROM card_steps WHERE card_id = ? ORDER BY position, id`,
);
export const findCardStep = db.query<CardStepRow, [number]>(
	`SELECT id, card_id AS cardId, title, assignee_id AS assigneeId, due_on AS dueOn, position, completed_at AS completedAt
   FROM card_steps WHERE id = ?`,
);
export const insertCardStep = db.query<null, [number, string, number | null, string | null, number]>(
	`INSERT INTO card_steps (card_id, title, assignee_id, due_on, position) VALUES (?, ?, ?, ?, ?)`,
);
export const updateCardStep = db.query<null, [string, number | null, string | null, number]>(
	`UPDATE card_steps SET title = ?, assignee_id = ?, due_on = ? WHERE id = ?`,
);
export const setCardStepCompleted = db.query<null, [string | null, number]>(
	`UPDATE card_steps SET completed_at = ? WHERE id = ?`,
);
export const deleteCardStep = db.query<null, [number]>(`DELETE FROM card_steps WHERE id = ?`);
