/**
 * Notification fan-out ("New for you"). Skips the actor, people who turned
 * project notifications off, and (for client-invisible items) clients.
 * Also handles @mentions and emails mentioned people when mail is enabled.
 */
import { mentionedIds, toPlainText } from "../../shared/markdown";
import {
	countUnread,
	insertNotification,
} from "../queries/notifications";
import { findProject, listMembers } from "../queries/projects";
import { findPerson } from "../queries/people";
import { sendMail } from "../mailer";
import { config } from "../config";
import { escapeHtml } from "../../shared/markdown";
import { nowIso } from "./time";

export interface NotifyInput {
	projectId: number | null;
	/** Required when projectId is null (pings); otherwise taken from the project. */
	accountId?: number;
	actorId: number | null;
	kind: string;
	title: string;
	excerpt?: string;
	url: string;
	/** When false, project clients are never notified. */
	clientVisible?: boolean;
}

export function notify(userIds: Iterable<number>, input: NotifyInput): void {
	const targets = new Set(userIds);
	if (input.actorId) targets.delete(input.actorId);
	if (targets.size === 0) return;

	let allowed: ((id: number) => boolean) | null = null;
	const accountId = input.projectId ? (findProject.get(input.projectId)?.accountId ?? 1) : (input.accountId ?? 1);
	if (input.projectId) {
		const members = new Map(listMembers.all(input.projectId).map((m) => [m.userId, m]));
		allowed = (id) => {
			const m = members.get(id);
			if (m && m.notify === 0) return false;
			if (m && m.role === "client" && !input.clientVisible) return false;
			return true;
		};
	}
	const excerpt = input.excerpt ? toPlainText(input.excerpt, 200) : "";
	for (const id of targets) {
		if (allowed && !allowed(id)) continue;
		insertNotification.run(
			id,
			input.actorId,
			input.kind,
			input.title,
			excerpt,
			input.url,
			input.projectId,
			null,
			accountId,
		);
	}
}

/** Notify + email people @mentioned in `body`. Returns the mentioned ids. */
export function notifyMentions(body: string, input: NotifyInput): number[] {
	const ids = mentionedIds(body).filter((id) => id !== input.actorId);
	if (ids.length === 0) return ids;
	notify(ids, { ...input, kind: "mention", title: `@mentioned you in: ${input.title}` });
	const actor = input.actorId ? findPerson.get(input.actorId) : null;
	for (const id of ids) {
		const person = findPerson.get(id);
		if (!person) continue;
		void sendMail({
			to: person.email,
			subject: `${actor?.name ?? "Someone"} mentioned you: ${input.title}`,
			text: `${actor?.name ?? "Someone"} mentioned you in ${input.title}:\n\n${toPlainText(body, 400)}\n\n${config.appUrl}${input.url}`,
			html: `<p>${escapeHtml(actor?.name ?? "Someone")} mentioned you in <strong>${escapeHtml(input.title)}</strong>:</p>
<blockquote>${escapeHtml(toPlainText(body, 400))}</blockquote>
<p><a href="${config.appUrl}${input.url}">Open it in GingerMint</a></p>`,
		}).catch(() => {});
	}
	return ids;
}

export const unreadCount = (userId: number, accountId: number): number =>
	countUnread.get(userId, nowIso(), accountId)?.n ?? 0;
