/** Project Chat (Campfire): real-time-ish via short polling, media + voice notes, boosts. */
import type { ChatLine } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	type ChatLineRow,
	deleteChatLine,
	findChatLine,
	insertChatLine,
	listChatLinesAfter,
	listChatLinesBefore,
	listRecentChatLines,
} from "../queries/chat";
import { deleteActivitiesFor } from "../queries/activities";
import { findAttachment } from "../queries/vault";
import { assertTool, isAdmin, loadProjectAsTeam } from "./access";
import { record } from "./activity";
import { attachmentMap } from "./attachments";
import { reactionsFor } from "./comments";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { notifyMentions } from "./notify";
import { personMap, pick } from "./people";

function toLines(rows: ChatLineRow[], viewerId: number): ChatLine[] {
	const people = personMap();
	const files = attachmentMap(rows.map((r) => r.attachmentId));
	const reactions = reactionsFor("chat_line", rows.map((r) => r.id), viewerId);
	return rows.map((r) => ({
		id: r.id,
		body: r.body,
		author: pick(people, r.authorId),
		attachment: r.attachmentId ? (files.get(r.attachmentId) ?? null) : null,
		createdAt: r.createdAt,
		reactions: reactions.get(r.id) ?? [],
	}));
}

function team(user: User, projectId: number) {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "chat");
	return access;
}

export function recent(user: User, projectId: number) {
	const access = team(user, projectId);
	return { access, lines: toLines(listRecentChatLines.all(projectId, 100), user.id) };
}

export function after(user: User, projectId: number, afterId: number): ChatLine[] {
	team(user, projectId);
	return toLines(listChatLinesAfter.all(projectId, afterId), user.id);
}

export function before(user: User, projectId: number, beforeId: number): ChatLine[] {
	team(user, projectId);
	return toLines(listChatLinesBefore.all(projectId, beforeId, 50), user.id);
}

/** Reactions for recently shown lines (polled with new lines so boosts stay live). */
export function reactionsSince(user: User, projectId: number, ids: number[]) {
	team(user, projectId);
	return Object.fromEntries(reactionsFor("chat_line", ids.slice(0, 200), user.id));
}

export function say(user: User, projectId: number, body: string, attachmentId: string | null): ChatLine {
	const access = team(user, projectId);
	const text = body.trim();
	if (!text && !attachmentId) throw new InputError({ body: "Type something first." });
	if (text.length > 10_000) throw new InputError({ body: "That's a very long line — try a message instead." });
	if (attachmentId) {
		const att = findAttachment.get(attachmentId);
		if (!att || (att.projectId !== null && att.projectId !== projectId) || att.userId !== user.id)
			throw new InputError({ attachmentId: "Attachment not found." });
	}
	const row = insertChatLine.get(projectId, user.id, text, attachmentId);
	if (!row) throw new Error("insert failed");
	const line = findChatLine.get(row.id);
	if (!line) throw new Error("insert failed");
	record({
		projectId, actorId: user.id, action: "chatted in", type: "chat_line", id: row.id, title: "Chat",
		excerpt: text || "shared a file", url: `/projects/${projectId}/chat#line-${row.id}`,
	});
	notifyMentions(text, {
		projectId, actorId: user.id, kind: "chat", title: `Chat: ${access.project.name}`,
		url: `/projects/${projectId}/chat#line-${row.id}`,
	});
	const [out] = toLines([line], user.id);
	if (!out) throw new Error("insert failed");
	return out;
}

export function removeLine(user: User, projectId: number, id: number): void {
	team(user, projectId);
	const line = findChatLine.get(id);
	if (!line || line.projectId !== projectId) throw new NotFoundError();
	if (line.authorId !== user.id && !isAdmin(user)) throw new ForbiddenError();
	deleteChatLine.run(id);
	deleteActivitiesFor.run("chat_line", id);
}
