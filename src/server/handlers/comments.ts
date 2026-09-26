/** Cross-cutting actions on any recordable: comments, boosts, subscriptions, Bubble Up, bookmarks. */
import * as comments from "../services/comments";
import * as inbox from "../services/inbox";
import { back, body, bool, type Ctx, id, me, num, str, wantsJson } from "./http";

export async function create(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	comments.addComment(user, str(b.type, 30), num(b.id) ?? 0, str(b.body));
	return back(c);
}

export async function update(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	comments.editComment(user, id(c), str(b.body));
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	comments.removeComment(user, id(c));
	return back(c);
}

export async function react(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const reactions = comments.toggleReaction(user, str(b.type, 30), num(b.id) ?? 0, str(b.emoji, 16));
	if (wantsJson(c)) return c.json({ reactions });
	return back(c);
}

export async function subscribe(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	comments.setSubscribed(user, str(b.type, 30), num(b.id) ?? 0, bool(b.on));
	return back(c);
}

/** Bubble Up any item or notification. */
export async function bubbleUp(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const when = str(b.when, 40);
	const at = b.notificationId
		? inbox.bubbleUpNotificationAt(user, num(b.notificationId) ?? 0, when)
		: inbox.bubbleUpItem(user, str(b.type, 30), num(b.id) ?? 0, when);
	if (wantsJson(c)) return c.json({ at });
	return back(c, "/home", { success: "Got it — it will bubble up in New for you." });
}

export async function bookmark(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const on = inbox.toggleBookmark(user, {
		url: str(b.url, 500),
		title: str(b.title, 200),
		kind: str(b.kind, 30),
		context: str(b.context, 120),
	});
	if (wantsJson(c)) return c.json({ bookmarked: on });
	return back(c);
}
