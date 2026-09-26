/**
 * To-dos: lists, loose to-dos, subtasks, assignees, "when done notify",
 * completion, reordering/moving, and Hill Charts on tracked lists.
 */
import type { HillUpdate, Person, Todo, TodoDetail, TodoList } from "../../shared/models";
import type { User } from "../../shared/types";
import { deleteActivitiesFor } from "../queries/activities";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import {
	addCompletionSubscriber,
	addTodoAssignee,
	clearCompletionSubscribers,
	clearTodoAssignees,
	deleteTodo,
	deleteTodoList,
	findTodo,
	findTodoList,
	insertHillUpdate,
	insertTodo,
	insertTodoList,
	listCompletionSubscribers,
	listHillUpdates,
	listProjectTodos,
	listSubtasks,
	listTodoAssignees,
	listTodoLists,
	maxListPosition,
	maxTodoPosition,
	moveSubtasksToList,
	moveTodo,
	setHillPosition,
	setHillTracked,
	setTodoCompleted,
	setTodoListPosition,
	type TodoListRow,
	type TodoRow,
	updateTodo,
	updateTodoList,
} from "../queries/todos";
import { transaction } from "../queries/tx";
import { assignableIds, loadProject, loadProjectAsTeam, type ProjectAccess } from "./access";
import { record } from "./activity";
import { InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { isDateStr, nowIso } from "./time";

const toList = (r: TodoListRow): TodoList => ({
	id: r.id,
	projectId: r.projectId,
	name: r.name,
	description: r.description,
	position: r.position,
	clientVisible: r.clientVisible === 1,
	hillTracked: r.hillTracked === 1,
	hillPosition: r.hillPosition,
	total: r.total,
	completed: r.completed,
	createdAt: r.createdAt,
});

export function toTodos(rows: TodoRow[], people = personMap()): Todo[] {
	const assignees = new Map<number, Person[]>();
	if (rows.length) {
		for (const a of listTodoAssignees.all(JSON.stringify(rows.map((r) => r.id)))) {
			const p = people.get(a.userId);
			if (!p) continue;
			const list = assignees.get(a.todoId) ?? [];
			list.push(p);
			assignees.set(a.todoId, list);
		}
	}
	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		listId: r.listId,
		parentId: r.parentId,
		title: r.title,
		notes: r.notes,
		dueOn: r.dueOn,
		position: r.position,
		completedAt: r.completedAt,
		completedBy: pick(people, r.completedBy),
		assignees: assignees.get(r.id) ?? [],
		subtaskCount: r.subtaskCount,
		subtasksDone: r.subtasksDone,
		commentCount: r.commentCount,
		createdBy: pick(people, r.createdBy),
		createdAt: r.createdAt,
	}));
}

/** Everything the To-dos tool page needs. */
export function overview(user: User, projectId: number) {
	const access = loadProject(user, projectId);
	const lists = listTodoLists.all(projectId, access.isClient ? 1 : 0).map(toList);
	const visibleListIds = new Set(lists.map((l) => l.id));
	const todos = toTodos(
		listProjectTodos
			.all(projectId)
			.filter((t) => (t.listId ? visibleListIds.has(t.listId) : !access.isClient)),
	);
	return { access, lists, todos, hillUpdates: hillHistory(projectId) };
}

function hillHistory(projectId: number): HillUpdate[] {
	const people = personMap();
	return listHillUpdates.all(projectId, 30).map((h) => ({
		id: h.id,
		listId: h.listId,
		listName: h.listName,
		position: h.position,
		person: pick(people, h.userId),
		createdAt: h.createdAt,
	}));
}

function ownTodo(access: ProjectAccess, id: number): TodoRow {
	const row = findTodo.get(id);
	if (!row || row.projectId !== access.project.id) throw new NotFoundError("To-do not found");
	if (access.isClient) {
		const list = row.listId ? findTodoList.get(row.listId) : null;
		if (list?.clientVisible !== 1) throw new NotFoundError("To-do not found");
	}
	return row;
}

function ownList(access: ProjectAccess, id: number): TodoListRow {
	const row = findTodoList.get(id);
	if (!row || row.projectId !== access.project.id) throw new NotFoundError("List not found");
	if (access.isClient && row.clientVisible !== 1) throw new NotFoundError("List not found");
	return row;
}

export function showTodo(user: User, projectId: number, id: number): { access: ProjectAccess; todo: TodoDetail } {
	const access = loadProject(user, projectId);
	const row = ownTodo(access, id);
	const people = personMap();
	const [todo] = toTodos([row], people);
	if (!todo) throw new NotFoundError();
	const list = row.listId ? findTodoList.get(row.listId) : null;
	const parent = row.parentId ? findTodo.get(row.parentId) : null;
	return {
		access,
		todo: {
			...todo,
			subtasks: toTodos(listSubtasks.all(id), people),
			notifyOnDone: listCompletionSubscribers
				.all(id)
				.map((s) => people.get(s.userId))
				.filter((p): p is Person => !!p),
			list: list ? { id: list.id, name: list.name } : null,
			parent: parent ? { id: parent.id, title: parent.title } : null,
		},
	};
}

export function showList(user: User, projectId: number, id: number) {
	const access = loadProject(user, projectId);
	const list = toList(ownList(access, id));
	const todos = toTodos(listProjectTodos.all(projectId).filter((t) => t.listId === id));
	return { access, list, todos };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function createList(
	user: User,
	projectId: number,
	input: { name: string; description: string; clientVisible: boolean },
): number {
	loadProjectAsTeam(user, projectId);
	if (!input.name.trim()) throw new InputError({ name: "Name the list." });
	const pos = (maxListPosition.get(projectId)?.p ?? 0) + 1;
	const row = insertTodoList.get(
		projectId, input.name.trim().slice(0, 200), input.description, pos, input.clientVisible ? 1 : 0, user.id,
	);
	if (!row) throw new Error("insert failed");
	record({
		projectId, actorId: user.id, action: "created a list", type: "todo_list", id: row.id,
		title: input.name.trim(), url: `/projects/${projectId}/todos/lists/${row.id}`, clientVisible: input.clientVisible,
	});
	return row.id;
}

export function updateList(
	user: User,
	projectId: number,
	id: number,
	input: { name: string; description: string; clientVisible: boolean },
): void {
	const access = loadProjectAsTeam(user, projectId);
	ownList(access, id);
	if (!input.name.trim()) throw new InputError({ name: "Name the list." });
	updateTodoList.run(input.name.trim().slice(0, 200), input.description, input.clientVisible ? 1 : 0, nowIso(), id);
}

export function removeList(user: User, projectId: number, id: number): void {
	const access = loadProjectAsTeam(user, projectId);
	ownList(access, id);
	deleteTodoList.run(id);
	deleteActivitiesFor.run("todo_list", id);
}

export function reorderLists(user: User, projectId: number, ids: number[]): void {
	const access = loadProjectAsTeam(user, projectId);
	transaction(() =>
		ids.forEach((id, i) => {
			ownList(access, id);
			setTodoListPosition.run(i + 1, id);
		}),
	);
}

// ---------------------------------------------------------------------------
// To-dos
// ---------------------------------------------------------------------------

export interface TodoInput {
	title: string;
	notes: string;
	dueOn: string | null;
	assigneeIds: number[];
	notifyIds: number[];
}

function validateTodo(input: TodoInput): void {
	const errors: Record<string, string> = {};
	if (!input.title.trim()) errors.title = "Describe the to-do.";
	if (input.title.length > 500) errors.title = "Keep it under 500 characters.";
	if (input.dueOn && !isDateStr(input.dueOn)) errors.dueOn = "Pick a valid date.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

function setPeople(todoId: number, projectId: number, input: TodoInput): number[] {
	const members = assignableIds(projectId);
	clearTodoAssignees.run(todoId);
	const assigned = [...new Set(input.assigneeIds)].filter((id) => members.has(id));
	for (const id of assigned) addTodoAssignee.run(todoId, id);
	clearCompletionSubscribers.run(todoId);
	for (const id of new Set(input.notifyIds)) if (members.has(id)) addCompletionSubscriber.run(todoId, id);
	return assigned;
}

export function createTodo(
	user: User,
	projectId: number,
	where: { listId: number | null; parentId: number | null },
	input: TodoInput,
): number {
	const access = loadProjectAsTeam(user, projectId);
	validateTodo(input);
	let listId = where.listId;
	if (where.parentId) {
		const parent = ownTodo(access, where.parentId);
		if (parent.parentId) throw new InputError({ title: "Subtasks can't have their own subtasks." });
		listId = parent.listId;
	} else if (listId) {
		ownList(access, listId);
	}
	const pos = (maxTodoPosition.get(projectId, listId, where.parentId)?.p ?? 0) + 1;
	const id = transaction(() => {
		const row = insertTodo.get(
			projectId, listId, where.parentId, input.title.trim(), input.notes, input.dueOn || null, pos, user.id,
		);
		if (!row) throw new Error("insert failed");
		return row.id;
	});
	const assigned = setPeople(id, projectId, input);
	subscribe.run("todo", id, user.id);
	const list = listId ? findTodoList.get(listId) : null;
	const url = `/projects/${projectId}/todos/${id}`;
	record({
		projectId, actorId: user.id, action: where.parentId ? "added a subtask" : "added a to-do", type: "todo", id,
		title: input.title.trim(), url, clientVisible: list?.clientVisible === 1,
		excerpt: list ? `in ${list.name}` : "",
	});
	notify(assigned, {
		projectId, actorId: user.id, kind: "assignment", title: `Assigned to you: ${input.title.trim()}`,
		url, clientVisible: list?.clientVisible === 1,
	});
	notifyMentions(input.notes, {
		projectId, actorId: user.id, kind: "todo", title: input.title.trim(), url, clientVisible: list?.clientVisible === 1,
	});
	return id;
}

export function updateTodoItem(user: User, projectId: number, id: number, input: TodoInput): void {
	const access = loadProjectAsTeam(user, projectId);
	const row = ownTodo(access, id);
	validateTodo(input);
	const before = new Set(listTodoAssignees.all(JSON.stringify([id])).map((a) => a.userId));
	updateTodo.run(input.title.trim(), input.notes, input.dueOn || null, nowIso(), id);
	const assigned = setPeople(id, projectId, input);
	const url = `/projects/${projectId}/todos/${id}`;
	notify(
		assigned.filter((a) => !before.has(a)),
		{ projectId, actorId: user.id, kind: "assignment", title: `Assigned to you: ${input.title.trim()}`, url },
	);
	if (row.dueOn !== (input.dueOn || null)) {
		record({
			projectId, actorId: user.id, action: "changed the due date of", type: "todo", id,
			title: input.title.trim(), url, excerpt: input.dueOn ? `Now due ${input.dueOn}` : "No due date",
		});
		notify(assigned, {
			projectId, actorId: user.id, kind: "due_date", title: `Due date changed: ${input.title.trim()}`,
			excerpt: input.dueOn ? `Now due ${input.dueOn}` : "No longer has a due date", url,
		});
	}
}

export function toggleTodo(user: User, projectId: number, id: number, done: boolean): void {
	const access = loadProject(user, projectId);
	const row = ownTodo(access, id);
	if (access.isClient) {
		// Clients may complete to-dos assigned to them only.
		const mine = listTodoAssignees.all(JSON.stringify([id])).some((a) => a.userId === user.id);
		if (!mine) throw new NotFoundError();
	}
	setTodoCompleted.run(done ? nowIso() : null, done ? user.id : null, id);
	if (!done) return;
	const url = `/projects/${projectId}/todos/${id}`;
	const list = row.listId ? findTodoList.get(row.listId) : null;
	record({
		projectId, actorId: user.id, action: "completed", type: "todo", id, title: row.title, url,
		clientVisible: list?.clientVisible === 1,
	});
	const watchers = new Set(listCompletionSubscribers.all(id).map((s) => s.userId));
	if (row.createdBy) watchers.add(row.createdBy);
	notify(watchers, {
		projectId, actorId: user.id, kind: "completed", title: `Completed: ${row.title}`, url,
		clientVisible: list?.clientVisible === 1,
	});
}

/** Move a to-do to another list (null = Loose To-dos) at a position. */
export function moveTodoItem(
	user: User,
	projectId: number,
	id: number,
	listId: number | null,
	beforeId: number | null,
): void {
	const access = loadProjectAsTeam(user, projectId);
	const row = ownTodo(access, id);
	if (row.parentId) throw new InputError({ listId: "Move the parent to-do instead." });
	if (listId) ownList(access, listId);
	let position: number;
	if (beforeId) {
		const before = ownTodo(access, beforeId);
		const siblings = listProjectTodos.all(projectId).filter((t) => t.listId === listId && t.id !== id);
		const idx = siblings.findIndex((s) => s.id === before.id);
		const prev = idx > 0 ? (siblings[idx - 1]?.position ?? before.position - 1) : before.position - 1;
		position = (prev + before.position) / 2;
	} else {
		position = (maxTodoPosition.get(projectId, listId, null)?.p ?? 0) + 1;
	}
	transaction(() => {
		moveTodo.run(listId, position, nowIso(), id);
		moveSubtasksToList.run(listId, id);
	});
}

export function removeTodo(user: User, projectId: number, id: number): void {
	const access = loadProjectAsTeam(user, projectId);
	ownTodo(access, id);
	deleteTodo.run(id);
	deleteCommentsFor.run("todo", id);
	deleteActivitiesFor.run("todo", id);
}

// ---------------------------------------------------------------------------
// Hill Charts
// ---------------------------------------------------------------------------

export function trackOnHill(user: User, projectId: number, listId: number, tracked: boolean): void {
	const access = loadProjectAsTeam(user, projectId);
	ownList(access, listId);
	setHillTracked.run(tracked ? 1 : 0, listId);
}

export function moveOnHill(user: User, projectId: number, listId: number, position: number): void {
	const access = loadProjectAsTeam(user, projectId);
	const list = ownList(access, listId);
	const pos = Math.max(0, Math.min(100, Math.round(position)));
	setHillPosition.run(pos, listId);
	insertHillUpdate.run(projectId, listId, user.id, pos);
	record({
		projectId, actorId: user.id, action: "updated the hill chart for", type: "todo_list", id: listId,
		title: list.name, url: `/projects/${projectId}/todos#hill`,
		excerpt: pos < 50 ? "Figuring things out" : pos === 100 ? "Done" : "Making it happen",
	});
}
