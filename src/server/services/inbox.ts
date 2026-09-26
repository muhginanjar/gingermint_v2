/**
 * Personal layer: "New for you" notifications, Bubble Up (resurface anything
 * later), My Bookmarks, My Notes, and "Recently visited" for the Jump menu.
 */
import type { Bookmark, Notification, Visit } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	bubbleUpNotification,
	cancelBubbleUp,
	deleteBookmark,
	deleteNotification,
	findBookmarkByUrl,
	findNote,
	insertBookmark,
	insertNotification,
	listBookmarks,
	listBubbledUp,
	listNotifications,
	listVisits,
	markAllNotificationsRead,
	markNotificationRead,
	markNotificationsReadByUrl,
	type NotificationRow,
	pruneVisits,
	upsertNote,
	upsertVisit,
} from "../queries/notifications";
import { visibleRecordable } from "./comments";
import { InputError } from "./errors";
import { personMap, pick } from "./people";
import { nowIso } from "./time";

function toNotifications(rows: NotificationRow[]): Notification[] {
	const people = personMap();
	return rows.map((r) => ({
		id: r.id,
		kind: r.kind,
		title: r.title,
		excerpt: r.excerpt,
		url: r.url,
		actor: pick(people, r.actorId),
		projectName: r.projectName,
		readAt: r.readAt,
		bubbleUpAt: r.bubbleUpAt,
		createdAt: r.createdAt,
	}));
}

export function feed(user: User) {
	const now = nowIso();
	const all = toNotifications(listNotifications.all(user.id, now, 60, user.accountId));
	return {
		unread: all.filter((n) => !n.readAt),
		previous: all.filter((n) => n.readAt).slice(0, 30),
		bubbled: toNotifications(listBubbledUp.all(user.id, now, user.accountId)),
	};
}

export function markRead(user: User, id: number): void {
	markNotificationRead.run(nowIso(), id, user.id);
}

export function markAllRead(user: User): void {
	markAllNotificationsRead.run(nowIso(), user.id, user.accountId);
}

/** Visiting a page clears the notifications pointing at it. */
export function markUrlRead(user: User, url: string): void {
	markNotificationsReadByUrl.run(nowIso(), user.id, url);
}

export function dismiss(user: User, id: number): void {
	deleteNotification.run(id, user.id);
}

/** Resolve a Bubble Up preset (later today / tomorrow / weekend / next week) or a date. */
export function bubbleTime(when: string, now = new Date()): string {
	const at = (d: Date, h: number) => {
		d.setHours(h, 0, 0, 0);
		return d.toISOString();
	};
	const d = new Date(now);
	switch (when) {
		case "later_today": {
			const later = new Date(now.getTime() + 3 * 3_600_000);
			return later.toISOString();
		}
		case "tomorrow":
			d.setDate(d.getDate() + 1);
			return at(d, 9);
		case "weekend": {
			const add = (6 - d.getDay() + 7) % 7 || 7;
			d.setDate(d.getDate() + add);
			return at(d, 9);
		}
		case "next_week": {
			const add = (8 - d.getDay()) % 7 || 7;
			d.setDate(d.getDate() + add);
			return at(d, 9);
		}
		default: {
			if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(when) && !Number.isNaN(Date.parse(when))) {
				const t = new Date(when.length === 10 ? `${when}T09:00:00` : when);
				if (t.getTime() <= now.getTime()) throw new InputError({ when: "Pick a time in the future." });
				return t.toISOString();
			}
			throw new InputError({ when: "Pick when this should bubble up." });
		}
	}
}

export function bubbleUpNotificationAt(user: User, id: number, when: string): string {
	const t = bubbleTime(when);
	bubbleUpNotification.run(t, id, user.id);
	return t;
}

/** Bubble up any item (message, to-do, …): creates a private reminder for later. */
export function bubbleUpItem(user: User, type: string, id: number, when: string): string {
	const r = visibleRecordable(user, type, id);
	const t = bubbleTime(when);
	insertNotification.run(user.id, user.id, "bubble_up", r.title, "You asked to see this again.", r.url, r.projectId, t, user.accountId);
	return t;
}

export function cancelBubble(user: User, id: number): void {
	cancelBubbleUp.run(id, user.id);
}

// Bookmarks -------------------------------------------------------------------

export const bookmarks = (user: User): Bookmark[] => listBookmarks.all(user.id, user.accountId);

export function isBookmarked(user: User, url: string): boolean {
	return !!findBookmarkByUrl.get(user.id, url);
}

const INTERNAL = /^\/(?!\/)[^\s]*$/;

export function toggleBookmark(user: User, input: { url: string; title: string; kind: string; context: string }): boolean {
	if (!INTERNAL.test(input.url)) throw new InputError({ url: "Only pages in GingerMint can be bookmarked." });
	const existing = findBookmarkByUrl.get(user.id, input.url);
	if (existing) {
		deleteBookmark.run(existing.id, user.id);
		return false;
	}
	insertBookmark.run(user.id, input.url, input.title.slice(0, 200) || input.url, input.kind.slice(0, 30), input.context.slice(0, 120), user.accountId);
	return true;
}

export function removeBookmark(user: User, id: number): void {
	deleteBookmark.run(id, user.id);
}

// My Notes ------------------------------------------------------------------------

export function note(user: User): { body: string; updatedAt: string | null } {
	const row = findNote.get(user.id);
	return { body: row?.body ?? "", updatedAt: row?.updatedAt ?? null };
}

export function saveNote(user: User, body: string): string {
	if (body.length > 100_000) throw new InputError({ body: "Your notes are too long." });
	const at = nowIso();
	upsertNote.run(user.id, body, at);
	return at;
}

// Recently visited -------------------------------------------------------------------

export function visit(user: User, v: { url: string; title: string; kind: string; context: string }): void {
	upsertVisit.run(user.id, v.url, v.title.slice(0, 200), v.kind, v.context.slice(0, 120), nowIso(), user.accountId);
	pruneVisits.run(user.id, 30);
}

export const recentVisits = (user: User, limit = 8): Visit[] => listVisits.all(user.id, user.accountId, limit);
