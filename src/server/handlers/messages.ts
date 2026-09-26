/** Message Board pages + actions. */
import * as messages from "../services/messages";
import { commentsFor, isSubscribed } from "../services/comments";
import { isBookmarked } from "../services/inbox";
import { assignablePeople } from "../services/access";
import { projectRef } from "../services/projects";
import { back, body, bool, type Ctx, id, me, redirect, render, str } from "./http";

const input = (b: Record<string, unknown>): messages.MessageInput => ({
	title: str(b.title, 200),
	body: str(b.body),
	category: str(b.category, 40),
	clientVisible: bool(b.clientVisible),
});

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, messages: list, categories } = messages.board(user, projectId);
	return render(
		c,
		"messages/Index",
		{ project: projectRef(access), messages: list, categories },
		{ title: "Message Board", kind: "message_board", context: access.project.name },
	);
}

export function newPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, categories } = messages.board(user, projectId);
	return render(c, "messages/Form", {
		project: projectRef(access),
		message: null,
		categories,
		people: assignablePeople(projectId),
	});
}

export async function create(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const messageId = messages.create(user, projectId, input(await body(c)));
	return redirect(c, `/projects/${projectId}/messages/${messageId}`, { success: "Posted." });
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, message } = messages.show(user, projectId, id(c));
	return render(
		c,
		"messages/Show",
		{
			project: projectRef(access),
			message,
			comments: commentsFor(user, "message", message.id),
			subscribed: isSubscribed(user.id, "message", message.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/messages/${message.id}`),
			people: assignablePeople(projectId),
			canEdit: message.author?.id === user.id || user.role === "admin",
		},
		{ title: message.title, kind: "message", context: access.project.name },
	);
}

export function editPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, message } = messages.show(user, projectId, id(c));
	const { categories } = messages.board(user, projectId);
	return render(c, "messages/Form", {
		project: projectRef(access),
		message,
		categories,
		people: assignablePeople(projectId),
	});
}

export async function update(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	messages.update(user, projectId, id(c), input(await body(c)));
	return redirect(c, `/projects/${projectId}/messages/${id(c)}`, { success: "Saved." });
}

export async function pin(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	messages.pin(user, id(c, "projectId"), id(c), bool(b.pinned));
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	messages.remove(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/messages`, { success: "Message deleted." });
}
