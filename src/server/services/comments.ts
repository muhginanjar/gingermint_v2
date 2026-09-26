/**
 * Comments, reactions (boosts) and subscriptions for any recordable.
 * New comments notify subscribers (creator + previous commenters + people
 * who subscribed) and @mentioned people.
 */
import type { Comment, ReactionGroup } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	deleteComment,
	deleteReaction,
	findComment,
	findReaction,
	insertComment,
	insertReaction,
	listComments,
	listReactionsFor,
	listSubscribers,
	subscribe,
	unsubscribe,
	updateComment,
} from "../queries/comments";
import { deleteActivitiesFor } from "../queries/activities";
import { isAdmin, loadProject } from "./access";
import { record } from "./activity";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { resolve, type Resolved } from "./recordables";
import { nowIso } from "./time";

/** Resolve a recordable and check the viewer can see it. */
export function visibleRecordable(user: User, type: string, id: number): Resolved {
	const r = resolve(type, id);
	if (!r) throw new NotFoundError();
	const access = loadProject(user, r.projectId);
	if (access.isClient && !r.clientVisible) throw new NotFoundError();
	return r;
}

/** Reactions grouped by emoji for a batch of recordables of one type. */
export function reactionsFor(type: string, ids: number[], viewerId: number): Map<number, ReactionGroup[]> {
	const out = new Map<number, ReactionGroup[]>();
	if (ids.length === 0) return out;
	for (const r of listReactionsFor.all(type, JSON.stringify(ids))) {
		const groups = out.get(r.recordableId) ?? [];
		let g = groups.find((x) => x.emoji === r.emoji);
		if (!g) {
			g = { emoji: r.emoji, count: 0, mine: false, people: [] };
			groups.push(g);
		}
		g.count++;
		g.people.push(r.userName);
		if (r.userId === viewerId) g.mine = true;
		out.set(r.recordableId, groups);
	}
	return out;
}

export function commentsFor(user: User, type: string, id: number): Comment[] {
	const rows = listComments.all(type, id);
	const people = personMap();
	const reactions = reactionsFor("comment", rows.map((r) => r.id), user.id);
	return rows.map((r) => ({
		id: r.id,
		body: r.body,
		author: pick(people, r.authorId),
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		reactions: reactions.get(r.id) ?? [],
		canEdit: r.authorId === user.id || isAdmin(user),
	}));
}

export function addComment(user: User, type: string, id: number, body: string): number {
	const text = body.trim();
	if (!text) throw new InputError({ body: "Write something first." });
	if (text.length > 50_000) throw new InputError({ body: "That comment is too long." });
	const r = visibleRecordable(user, type, id);
	const row = insertComment.get(r.projectId, r.type, r.id, user.id, text);
	if (!row) throw new Error("insert failed");
	const url = `${r.url}#comment-${row.id}`;
	record({
		projectId: r.projectId,
		actorId: user.id,
		action: "commented",
		type: r.type,
		id: r.id,
		title: r.title,
		excerpt: text,
		url,
		clientVisible: r.clientVisible,
	});
	const subscribers = new Set(listSubscribers.all(r.type, r.id).map((s) => s.userId));
	if (r.creatorId) subscribers.add(r.creatorId);
	const mentioned = notifyMentions(text, {
		projectId: r.projectId, actorId: user.id, kind: "comment", title: r.title, url, clientVisible: r.clientVisible,
	});
	for (const m of mentioned) subscribers.delete(m);
	notify(subscribers, {
		projectId: r.projectId,
		actorId: user.id,
		kind: "comment",
		title: `Re: ${r.title}`,
		excerpt: text,
		url,
		clientVisible: r.clientVisible,
	});
	subscribe.run(r.type, r.id, user.id);
	return row.id;
}

function ownComment(user: User, commentId: number) {
	const c = findComment.get(commentId);
	if (!c) throw new NotFoundError();
	loadProject(user, c.projectId);
	if (c.authorId !== user.id && !isAdmin(user)) throw new ForbiddenError("You can only change your own comments.");
	return c;
}

export function editComment(user: User, commentId: number, body: string): void {
	ownComment(user, commentId);
	if (!body.trim()) throw new InputError({ body: "Write something first." });
	updateComment.run(body.trim(), nowIso(), commentId);
}

export function removeComment(user: User, commentId: number): void {
	ownComment(user, commentId);
	deleteComment.run(commentId);
	deleteActivitiesFor.run("comment", commentId);
}

export const REACTION_EMOJI = ["👍", "❤️", "😂", "🎉", "🙌", "👀", "🔥", "✅", "🚀", "🙏"];

/** Toggle an emoji reaction; returns the new groups for that recordable. */
export function toggleReaction(user: User, type: string, id: number, emoji: string): ReactionGroup[] {
	if (!emoji || [...emoji].length > 4) throw new InputError({ emoji: "Pick an emoji." });
	if (type === "ping_message") {
		// Ping access is checked by the pings service caller.
	} else {
		visibleRecordable(user, type, id);
	}
	const existing = findReaction.get(type, id, user.id, emoji);
	if (existing) deleteReaction.run(existing.id);
	else insertReaction.run(type, id, user.id, emoji);
	return reactionsFor(type, [id], user.id).get(id) ?? [];
}

export function isSubscribed(userId: number, type: string, id: number): boolean {
	return listSubscribers.all(type, id).some((s) => s.userId === userId);
}

export function setSubscribed(user: User, type: string, id: number, on: boolean): void {
	const r = visibleRecordable(user, type, id);
	if (on) subscribe.run(r.type, r.id, user.id);
	else unsubscribe.run(r.type, r.id, user.id);
}

export function subscribers(type: string, id: number): number[] {
	return listSubscribers.all(type, id).map((s) => s.userId);
}
