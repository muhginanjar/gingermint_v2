/** Project Chat page + JSON polling endpoints. */
import * as chat from "../services/chat";
import { assignablePeople } from "../services/access";
import { projectRef } from "../services/projects";
import { body, type Ctx, id, ids, me, num, optStr, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, lines } = chat.recent(user, projectId);
	return render(
		c,
		"chat/Index",
		{ project: projectRef(access), lines, people: assignablePeople(projectId) },
		{ title: "Chat", kind: "chat", context: access.project.name },
	);
}

export function poll(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const before = num(c.req.query("before"));
	if (before) return c.json({ lines: chat.before(user, projectId, before) });
	const lines = chat.after(user, projectId, num(c.req.query("after")) ?? 0);
	const watch = ids((c.req.query("watch") ?? "").split(",").filter(Boolean));
	return c.json({ lines, reactions: watch.length ? chat.reactionsSince(user, projectId, watch) : {} });
}

export async function say(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const line = chat.say(user, id(c, "projectId"), str(b.body, 10_000), optStr(b.attachmentId));
	return c.json({ line });
}

export function destroy(c: Ctx) {
	const user = me(c);
	chat.removeLine(user, id(c, "projectId"), id(c));
	return c.json({ ok: true });
}
