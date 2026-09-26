/**
 * JSON API v1 for CLIs, scripts and AI agents. Authenticate with a personal
 * token: `Authorization: Bearer gm_…` (create one on your Profile page).
 * Every call runs through the same services as the web UI, so permissions
 * are identical.
 */
import type { Context, Next } from "hono";
import type { AppEnv } from "../inertia-middleware";
import { userFromToken } from "../services/integrations";
import { visibleProjects, projectDetail } from "../services/projects";
import * as todos from "../services/todos";
import * as messages from "../services/messages";
import { addComment, commentsFor } from "../services/comments";
import { timeline } from "../services/activity";
import { search } from "../services/discovery";
import { myAssignments } from "../services/schedule";
import { body, type Ctx, id, ids, me, num, optStr, str } from "./http";

/** Middleware: resolve the bearer token into c.var.user (no cookies involved). */
export async function tokenAuth(c: Context<AppEnv>, next: Next) {
	const user = userFromToken(c.req.header("authorization"));
	if (!user) return c.json({ error: "Unauthorized — send Authorization: Bearer <token>" }, 401);
	c.set("user", user);
	await next();
}

export const whoami = (c: Ctx) => c.json({ user: me(c) });
export const listProjects = (c: Ctx) => c.json({ projects: visibleProjects(me(c)) });
export const getProject = (c: Ctx) => c.json({ project: projectDetail(me(c), id(c, "projectId")) });

export function listTodos(c: Ctx) {
	const o = todos.overview(me(c), id(c, "projectId"));
	return c.json({ lists: o.lists, todos: o.todos });
}

export async function createTodo(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const todoId = todos.createTodo(
		user,
		id(c, "projectId"),
		{ listId: num(b.listId), parentId: num(b.parentId) },
		{ title: str(b.title, 500), notes: str(b.notes), dueOn: optStr(b.dueOn), assigneeIds: ids(b.assigneeIds), notifyIds: [] },
	);
	return c.json({ todo: todos.showTodo(user, id(c, "projectId"), todoId).todo }, 201);
}

export async function completeTodo(c: Ctx) {
	const b = await body(c);
	todos.toggleTodo(me(c), id(c, "projectId"), id(c), b.done !== false);
	return c.json({ ok: true });
}

export const listMessages = (c: Ctx) => c.json({ messages: messages.board(me(c), id(c, "projectId")).messages });

export async function createMessage(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const messageId = messages.create(user, id(c, "projectId"), {
		title: str(b.title, 200),
		body: str(b.body),
		category: str(b.category, 40),
		clientVisible: b.clientVisible === true,
	});
	return c.json({ message: messages.show(user, id(c, "projectId"), messageId).message }, 201);
}

export async function comment(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const type = str(b.type, 30);
	const rid = num(b.id) ?? 0;
	addComment(user, type, rid, str(b.body));
	return c.json({ comments: commentsFor(user, type, rid) }, 201);
}

export const activity = (c: Ctx) =>
	c.json({ activity: timeline(me(c), { projectId: num(c.req.query("project")) ?? 0, limit: 100 }) });
export const searchApi = (c: Ctx) => c.json({ results: search(me(c), c.req.query("q") ?? "", 50) });
export const assignments = (c: Ctx) => c.json({ assignments: myAssignments(me(c)) });
