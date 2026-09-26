/** Pings: private 1:1 or small-group conversations outside projects. */
import type { ChatLine, PingThread, Person } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	addPingParticipant,
	countPingUnread,
	findPingThreadFor,
	findThreadByParticipants,
	insertPingMessage,
	insertPingThread,
	lastPingMessage,
	listPingMessages,
	listPingMessagesAfter,
	listPingParticipants,
	listPingThreads,
	markPingRead,
	type PingMessageRow,
	totalPingUnread,
	touchPingThread,
} from "../queries/chat";
import { findPerson } from "../queries/people";
import { findAttachment } from "../queries/vault";
import { transaction } from "../queries/tx";
import { isMember } from "./accounts";
import { attachmentMap } from "./attachments";
import { reactionsFor } from "./comments";
import { InputError, NotFoundError } from "./errors";
import { notify } from "./notify";
import { personMap, pick } from "./people";
import { nowIso } from "./time";

function participantsOf(threadIds: number[], people = personMap()): Map<number, Person[]> {
	const out = new Map<number, Person[]>();
	if (!threadIds.length) return out;
	for (const p of listPingParticipants.all(JSON.stringify(threadIds))) {
		const person = people.get(p.userId);
		if (person) out.set(p.threadId, [...(out.get(p.threadId) ?? []), person]);
	}
	return out;
}

export function threads(user: User): PingThread[] {
	const rows = listPingThreads.all(user.id, user.accountId);
	const people = personMap();
	const parts = participantsOf(rows.map((r) => r.id), people);
	return rows.map((r) => {
		const last = lastPingMessage.get(r.id);
		return {
			id: r.id,
			participants: (parts.get(r.id) ?? []).filter((p) => p.id !== user.id),
			lastMessage: last
				? { body: last.body || (last.attachmentId ? "📎 Attachment" : ""), authorName: last.authorName ?? "", createdAt: last.createdAt }
				: null,
			unread: countPingUnread.get(r.id, r.lastReadId, user.id)?.n ?? 0,
			updatedAt: r.updatedAt,
		};
	});
}

export const unreadPings = (userId: number, accountId: number): number => totalPingUnread.get(userId, accountId)?.n ?? 0;

function toLines(rows: PingMessageRow[], viewerId: number): ChatLine[] {
	const people = personMap();
	const files = attachmentMap(rows.map((r) => r.attachmentId));
	const reactions = reactionsFor("ping_message", rows.map((r) => r.id), viewerId);
	return rows.map((r) => ({
		id: r.id,
		body: r.body,
		author: pick(people, r.authorId),
		attachment: r.attachmentId ? (files.get(r.attachmentId) ?? null) : null,
		createdAt: r.createdAt,
		reactions: reactions.get(r.id) ?? [],
	}));
}

function own(user: User, threadId: number) {
	const t = findPingThreadFor.get(threadId, user.id, user.accountId);
	if (!t) throw new NotFoundError("Conversation not found");
	return t;
}

export function thread(user: User, threadId: number) {
	own(user, threadId);
	const messages = toLines(listPingMessages.all(threadId), user.id);
	const last = messages.at(-1);
	if (last) markPingRead.run(last.id, threadId, user.id);
	const participants = participantsOf([threadId]).get(threadId) ?? [];
	return { id: threadId, participants, messages };
}

export function after(user: User, threadId: number, afterId: number): ChatLine[] {
	own(user, threadId);
	const lines = toLines(listPingMessagesAfter.all(threadId, afterId), user.id);
	const last = lines.at(-1);
	if (last) markPingRead.run(last.id, threadId, user.id);
	return lines;
}

/** Open (or reuse) the conversation with exactly these people. */
export function start(user: User, personIds: number[]): number {
	const ids = [...new Set([user.id, ...personIds])];
	if (ids.length < 2) throw new InputError({ people: "Pick someone to ping." });
	if (ids.length > 12) throw new InputError({ people: "Pings are for small groups — try a project chat." });
	// Pings stay inside the workspace: only its members can be pinged here.
	for (const id of ids) if (!findPerson.get(id) || !isMember(user.accountId, id)) throw new InputError({ people: "Unknown person." });
	const existing = findThreadByParticipants.get(JSON.stringify(ids), ids.length, user.accountId);
	if (existing) return existing.id;
	return transaction(() => {
		const row = insertPingThread.get(user.id, user.accountId);
		if (!row) throw new Error("insert failed");
		for (const id of ids) addPingParticipant.run(row.id, id);
		return row.id;
	});
}

export function send(user: User, threadId: number, body: string, attachmentId: string | null): ChatLine {
	own(user, threadId);
	const text = body.trim();
	if (!text && !attachmentId) throw new InputError({ body: "Type something first." });
	if (attachmentId) {
		const att = findAttachment.get(attachmentId);
		if (!att || att.userId !== user.id || att.projectId !== null) throw new InputError({ attachmentId: "Attachment not found." });
	}
	const row = insertPingMessage.get(threadId, user.id, text, attachmentId);
	if (!row) throw new Error("insert failed");
	touchPingThread.run(nowIso(), threadId);
	markPingRead.run(row.id, threadId, user.id);
	const others = (participantsOf([threadId]).get(threadId) ?? []).map((p) => p.id);
	notify(others, {
		projectId: null, accountId: user.accountId, actorId: user.id, kind: "ping", title: `Ping from ${user.name}`,
		excerpt: text || "📎 Attachment", url: `/pings/${threadId}`,
	});
	const [line] = toLines(
		[{ id: row.id, threadId, authorId: user.id, body: text, attachmentId, createdAt: nowIso() }],
		user.id,
	);
	if (!line) throw new Error("insert failed");
	return line;
}

export function canReact(user: User, messageId: number, threadId: number): void {
	own(user, threadId);
	if (!listPingMessages.all(threadId).some((m) => m.id === messageId)) throw new NotFoundError();
}
