/** To-do lists, to-dos (loose + subtasks), assignees, completion subscribers, hill updates. */
import { db } from "../db";

export interface TodoListRow {
	id: number;
	projectId: number;
	name: string;
	description: string;
	position: number;
	clientVisible: number;
	hillTracked: number;
	hillPosition: number;
	total: number;
	completed: number;
	createdAt: string;
}

const LIST_COLS = `l.id, l.project_id AS projectId, l.name, l.description, l.position,
  l.client_visible AS clientVisible, l.hill_tracked AS hillTracked, l.hill_position AS hillPosition,
  (SELECT COUNT(*) FROM todos t WHERE t.list_id = l.id AND t.parent_id IS NULL) AS total,
  (SELECT COUNT(*) FROM todos t WHERE t.list_id = l.id AND t.parent_id IS NULL AND t.completed_at IS NOT NULL) AS completed,
  l.created_at AS createdAt`;

export const listTodoLists = db.query<TodoListRow, [number, number]>(
	`SELECT ${LIST_COLS} FROM todo_lists l WHERE l.project_id = ?1 AND (?2 = 0 OR l.client_visible = 1)
   ORDER BY l.position, l.id`,
);
export const findTodoList = db.query<TodoListRow, [number]>(
	`SELECT ${LIST_COLS} FROM todo_lists l WHERE l.id = ?`,
);
export const insertTodoList = db.query<{ id: number }, [number, string, string, number, number, number]>(
	`INSERT INTO todo_lists (project_id, name, description, position, client_visible, created_by)
   VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateTodoList = db.query<null, [string, string, number, string, number]>(
	`UPDATE todo_lists SET name = ?, description = ?, client_visible = ?, updated_at = ? WHERE id = ?`,
);
export const setTodoListPosition = db.query<null, [number, number]>(
	`UPDATE todo_lists SET position = ? WHERE id = ?`,
);
export const setHillTracked = db.query<null, [number, number]>(
	`UPDATE todo_lists SET hill_tracked = ? WHERE id = ?`,
);
export const setHillPosition = db.query<null, [number, number]>(
	`UPDATE todo_lists SET hill_position = ? WHERE id = ?`,
);
export const deleteTodoList = db.query<null, [number]>(`DELETE FROM todo_lists WHERE id = ?`);
export const maxListPosition = db.query<{ p: number | null }, [number]>(
	`SELECT MAX(position) AS p FROM todo_lists WHERE project_id = ?`,
);

export interface TodoRow {
	id: number;
	projectId: number;
	listId: number | null;
	parentId: number | null;
	title: string;
	notes: string;
	dueOn: string | null;
	position: number;
	completedAt: string | null;
	completedBy: number | null;
	createdBy: number | null;
	createdAt: string;
	subtaskCount: number;
	subtasksDone: number;
	commentCount: number;
}

const TODO_COLS = `t.id, t.project_id AS projectId, t.list_id AS listId, t.parent_id AS parentId, t.title, t.notes,
  t.due_on AS dueOn, t.position, t.completed_at AS completedAt, t.completed_by AS completedBy,
  t.created_by AS createdBy, t.created_at AS createdAt,
  (SELECT COUNT(*) FROM todos s WHERE s.parent_id = t.id) AS subtaskCount,
  (SELECT COUNT(*) FROM todos s WHERE s.parent_id = t.id AND s.completed_at IS NOT NULL) AS subtasksDone,
  (SELECT COUNT(*) FROM comments c WHERE c.recordable_type = 'todo' AND c.recordable_id = t.id) AS commentCount`;

/** Top-level to-dos of a project (lists + loose), subtasks excluded. */
export const listProjectTodos = db.query<TodoRow, [number]>(
	`SELECT ${TODO_COLS} FROM todos t WHERE t.project_id = ? AND t.parent_id IS NULL
   ORDER BY (t.completed_at IS NOT NULL), t.position, t.id`,
);
export const listSubtasks = db.query<TodoRow, [number]>(
	`SELECT ${TODO_COLS} FROM todos t WHERE t.parent_id = ? ORDER BY t.position, t.id`,
);
export const findTodo = db.query<TodoRow, [number]>(
	`SELECT ${TODO_COLS} FROM todos t WHERE t.id = ?`,
);
export const insertTodo = db.query<
	{ id: number },
	[number, number | null, number | null, string, string, string | null, number, number]
>(
	`INSERT INTO todos (project_id, list_id, parent_id, title, notes, due_on, position, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateTodo = db.query<null, [string, string, string | null, string, number]>(
	`UPDATE todos SET title = ?, notes = ?, due_on = ?, updated_at = ? WHERE id = ?`,
);
export const moveTodo = db.query<null, [number | null, number, string, number]>(
	`UPDATE todos SET list_id = ?, position = ?, updated_at = ? WHERE id = ?`,
);
export const moveSubtasksToList = db.query<null, [number | null, number]>(
	`UPDATE todos SET list_id = ? WHERE parent_id = ?`,
);
export const setTodoCompleted = db.query<null, [string | null, number | null, number]>(
	`UPDATE todos SET completed_at = ?, completed_by = ? WHERE id = ?`,
);
export const deleteTodo = db.query<null, [number]>(`DELETE FROM todos WHERE id = ?`);
export const maxTodoPosition = db.query<{ p: number | null }, [number, number | null, number | null]>(
	`SELECT MAX(position) AS p FROM todos WHERE project_id = ? AND list_id IS ? AND parent_id IS ?`,
);

// Assignees ---------------------------------------------------------------------

export const listTodoAssignees = db.query<{ todoId: number; userId: number }, [string]>(
	`SELECT todo_id AS todoId, user_id AS userId FROM todo_assignees WHERE todo_id IN (SELECT value FROM json_each(?))`,
);
export const clearTodoAssignees = db.query<null, [number]>(
	`DELETE FROM todo_assignees WHERE todo_id = ?`,
);
export const addTodoAssignee = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO todo_assignees (todo_id, user_id) VALUES (?, ?)`,
);
export const listCompletionSubscribers = db.query<{ userId: number }, [number]>(
	`SELECT user_id AS userId FROM todo_completion_subscribers WHERE todo_id = ?`,
);
export const clearCompletionSubscribers = db.query<null, [number]>(
	`DELETE FROM todo_completion_subscribers WHERE todo_id = ?`,
);
export const addCompletionSubscriber = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO todo_completion_subscribers (todo_id, user_id) VALUES (?, ?)`,
);

/** Open to-dos assigned to a person across the given projects (My Tasks / Due Today). */
export const listAssignedTodos = db.query<TodoRow & { projectName: string }, [number, string]>(
	`SELECT ${TODO_COLS}, p.name AS projectName FROM todos t
   JOIN todo_assignees a ON a.todo_id = t.id AND a.user_id = ?1
   JOIN projects p ON p.id = t.project_id
   WHERE t.completed_at IS NULL AND p.archived_at IS NULL
     AND t.project_id IN (SELECT value FROM json_each(?2))
   ORDER BY t.due_on IS NULL, t.due_on, t.created_at`,
);

/** Open to-dos with a due date in [from, to] across the given projects. */
export const listDueTodos = db.query<
	TodoRow & { projectName: string; projectColor: string },
	[string, string, string]
>(
	`SELECT ${TODO_COLS}, p.name AS projectName, p.color AS projectColor FROM todos t
   JOIN projects p ON p.id = t.project_id
   WHERE t.due_on BETWEEN ?1 AND ?2 AND p.archived_at IS NULL
     AND t.project_id IN (SELECT value FROM json_each(?3))
   ORDER BY t.due_on, t.id`,
);

// Hill updates --------------------------------------------------------------------

export const insertHillUpdate = db.query<null, [number, number, number, number]>(
	`INSERT INTO hill_updates (project_id, list_id, user_id, position) VALUES (?, ?, ?, ?)`,
);
export const listHillUpdates = db.query<
	{ id: number; listId: number; listName: string; position: number; userId: number | null; createdAt: string },
	[number, number]
>(
	`SELECT h.id, h.list_id AS listId, l.name AS listName, h.position, h.user_id AS userId, h.created_at AS createdAt
   FROM hill_updates h JOIN todo_lists l ON l.id = h.list_id
   WHERE h.project_id = ? ORDER BY h.created_at DESC LIMIT ?`,
);
