/** To-dos: tool page, lists, to-do detail, subtasks, completion, moving, Hill Charts. */
import * as todos from "../services/todos";
import { assignablePeople } from "../services/access";
import { commentsFor, isSubscribed } from "../services/comments";
import { isBookmarked } from "../services/inbox";
import { projectRef } from "../services/projects";
import { back, body, bool, type Ctx, id, ids, me, num, optStr, redirect, render, str, wantsJson } from "./http";

const todoInput = (b: Record<string, unknown>): todos.TodoInput => ({
	title: str(b.title, 500),
	notes: str(b.notes),
	dueOn: optStr(b.dueOn),
	assigneeIds: ids(b.assigneeIds),
	notifyIds: ids(b.notifyIds),
});

const listInput = (b: Record<string, unknown>) => ({
	name: str(b.name, 200),
	description: str(b.description, 5000),
	clientVisible: bool(b.clientVisible),
});

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const o = todos.overview(user, projectId);
	return render(
		c,
		"todos/Index",
		{ project: projectRef(o.access), lists: o.lists, todos: o.todos, hillUpdates: o.hillUpdates, people: assignablePeople(projectId) },
		{ title: "To-dos", kind: "todos", context: o.access.project.name },
	);
}

export function showList(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, list, todos: items } = todos.showList(user, projectId, id(c));
	return render(
		c,
		"todos/List",
		{
			project: projectRef(access),
			list,
			todos: items,
			people: assignablePeople(projectId),
			comments: commentsFor(user, "todo_list", list.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/todos/lists/${list.id}`),
		},
		{ title: list.name, kind: "todo_list", context: access.project.name },
	);
}

export async function createList(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	todos.createList(user, projectId, listInput(await body(c)));
	return back(c, `/projects/${projectId}/todos`);
}

export async function updateList(c: Ctx) {
	const user = me(c);
	todos.updateList(user, id(c, "projectId"), id(c), listInput(await body(c)));
	return back(c);
}

export function destroyList(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	todos.removeList(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/todos`, { success: "List deleted." });
}

export async function reorderLists(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	todos.reorderLists(user, id(c, "projectId"), ids(b.ids));
	return back(c);
}

export async function create(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const b = await body(c);
	todos.createTodo(user, projectId, { listId: num(b.listId), parentId: num(b.parentId) }, todoInput(b));
	return back(c, `/projects/${projectId}/todos`);
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, todo } = todos.showTodo(user, projectId, id(c));
	return render(
		c,
		"todos/Show",
		{
			project: projectRef(access),
			todo,
			people: assignablePeople(projectId),
			comments: commentsFor(user, "todo", todo.id),
			subscribed: isSubscribed(user.id, "todo", todo.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/todos/${todo.id}`),
		},
		{ title: todo.title, kind: "todo", context: access.project.name },
	);
}

export async function update(c: Ctx) {
	const user = me(c);
	todos.updateTodoItem(user, id(c, "projectId"), id(c), todoInput(await body(c)));
	return back(c);
}

export async function toggle(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	todos.toggleTodo(user, id(c, "projectId"), id(c), bool(b.done));
	if (wantsJson(c)) return c.json({ ok: true });
	return back(c);
}

export async function move(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	todos.moveTodoItem(user, id(c, "projectId"), id(c), num(b.listId), num(b.beforeId));
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	todos.removeTodo(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/todos`, { success: "To-do deleted." });
}

export async function track(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	todos.trackOnHill(user, id(c, "projectId"), id(c), bool(b.tracked));
	return back(c);
}

export async function hill(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	todos.moveOnHill(user, id(c, "projectId"), id(c), num(b.position) ?? 0);
	return back(c);
}
