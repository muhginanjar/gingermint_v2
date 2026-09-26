/** Pings: conversation list, a conversation, polling, sending, starting. */
import * as pings from "../services/pings";
import { allPeople } from "../services/people";
import { toggleReaction } from "../services/comments";
import { body, type Ctx, id, ids, me, num, optStr, redirect, render, str, wantsJson } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	return render(c, "pings/Index", { threads: pings.threads(user), people: allPeople(user.accountId).filter((p) => p.id !== user.id) }, { title: "Pings", kind: "pings" });
}

export function threadsJson(c: Ctx) {
	const user = me(c);
	return c.json({ threads: pings.threads(user), unread: pings.unreadPings(user.id, user.accountId) });
}

export function people(c: Ctx) {
	const user = me(c);
	return c.json({ people: allPeople(user.accountId).filter((p) => p.id !== user.id) });
}

export function show(c: Ctx) {
	const user = me(c);
	const t = pings.thread(user, id(c));
	const names = t.participants.filter((p) => p.id !== user.id).map((p) => p.name).join(", ");
	return render(c, "pings/Show", { thread: t, threads: pings.threads(user) }, { title: `Ping: ${names}`, kind: "ping" });
}

export function poll(c: Ctx) {
	const user = me(c);
	return c.json({ lines: pings.after(user, id(c), num(c.req.query("after")) ?? 0) });
}

export async function start(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const threadId = pings.start(user, ids(b.personIds));
	const text = str(b.body, 10_000).trim();
	if (text) pings.send(user, threadId, text, null);
	if (wantsJson(c)) return c.json({ id: threadId });
	return redirect(c, `/pings/${threadId}`);
}

export async function send(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	return c.json({ line: pings.send(user, id(c), str(b.body, 10_000), optStr(b.attachmentId)) });
}

export async function react(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const messageId = id(c, "messageId");
	pings.canReact(user, messageId, id(c));
	return c.json({ reactions: toggleReaction(user, "ping_message", messageId, str(b.emoji, 16)) });
}
