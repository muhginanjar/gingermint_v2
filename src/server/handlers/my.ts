/** My Bar + New for You JSON endpoints: notifications, tasks, events, due today, bookmarks, notes. */
import * as inbox from "../services/inbox";
import { myAssignments, myEvents } from "../services/schedule";
import { threads, unreadPings } from "../services/pings";
import { unreadCount } from "../services/notify";
import { today } from "../services/time";
import { body, type Ctx, id, me, str } from "./http";

export function notifications(c: Ctx) {
	const user = me(c);
	return c.json({ ...inbox.feed(user), pings: threads(user).slice(0, 12), unreadCount: unreadCount(user.id, user.accountId), pingUnread: unreadPings(user.id, user.accountId) });
}

export function counts(c: Ctx) {
	const user = me(c);
	return c.json({ unreadCount: unreadCount(user.id, user.accountId), pingUnread: unreadPings(user.id, user.accountId) });
}

export function readOne(c: Ctx) {
	const user = me(c);
	inbox.markRead(user, id(c));
	return c.json({ ok: true });
}

export function readAll(c: Ctx) {
	const user = me(c);
	inbox.markAllRead(user);
	return c.json({ ok: true });
}

export function dismiss(c: Ctx) {
	const user = me(c);
	inbox.dismiss(user, id(c));
	return c.json({ ok: true });
}

export function cancelBubble(c: Ctx) {
	const user = me(c);
	inbox.cancelBubble(user, id(c));
	return c.json({ ok: true });
}

export function tasks(c: Ctx) {
	const user = me(c);
	return c.json({ items: myAssignments(user) });
}

export function events(c: Ctx) {
	const user = me(c);
	return c.json({ entries: myEvents(user, 21) });
}

export function dueToday(c: Ctx) {
	const user = me(c);
	const t = today();
	const items = myAssignments(user).filter((i) => i.dueOn && i.dueOn <= t);
	const todayEvents = myEvents(user, 1).filter((e) => e.startsAt.slice(0, 10) <= t);
	return c.json({ items, events: todayEvents, today: t });
}

export function bookmarks(c: Ctx) {
	const user = me(c);
	return c.json({ bookmarks: inbox.bookmarks(user) });
}

export function removeBookmark(c: Ctx) {
	const user = me(c);
	inbox.removeBookmark(user, id(c));
	return c.json({ ok: true });
}

export function note(c: Ctx) {
	const user = me(c);
	return c.json(inbox.note(user));
}

export async function saveNote(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	return c.json({ updatedAt: inbox.saveNote(user, str(b.body)) });
}
