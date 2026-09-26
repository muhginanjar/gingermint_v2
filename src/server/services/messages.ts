/** Message Board: announcements + threaded discussion. */
import type { Message } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	deleteMessage,
	findMessage,
	insertMessage,
	listMessageCategories,
	listMessages,
	type MessageRow,
	setMessagePinned,
	updateMessage,
} from "../queries/messages";
import { deleteActivitiesFor } from "../queries/activities";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import { listMembers } from "../queries/projects";
import { isAdmin, loadProject, loadProjectAsTeam } from "./access";
import { record } from "./activity";
import { reactionsFor } from "./comments";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { nowIso } from "./time";

function toMessages(rows: MessageRow[], viewerId: number): Message[] {
	const people = personMap();
	const reactions = reactionsFor("message", rows.map((r) => r.id), viewerId);
	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		title: r.title,
		body: r.body,
		category: r.category,
		pinned: r.pinned === 1,
		clientVisible: r.clientVisible === 1,
		author: pick(people, r.authorId),
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		commentCount: r.commentCount,
		reactions: reactions.get(r.id) ?? [],
	}));
}

export function board(user: User, projectId: number) {
	const access = loadProject(user, projectId);
	return {
		access,
		messages: toMessages(listMessages.all(projectId, access.isClient ? 1 : 0), user.id),
		categories: listMessageCategories.all(projectId).map((c) => c.category),
	};
}

export function show(user: User, projectId: number, id: number) {
	const access = loadProject(user, projectId);
	const row = findMessage.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	if (access.isClient && row.clientVisible !== 1) throw new NotFoundError();
	const [message] = toMessages([row], user.id);
	if (!message) throw new NotFoundError();
	return { access, message };
}

export interface MessageInput {
	title: string;
	body: string;
	category: string;
	clientVisible: boolean;
}

function validate(input: MessageInput): void {
	const errors: Record<string, string> = {};
	if (!input.title.trim()) errors.title = "Give your message a title.";
	if (input.title.length > 200) errors.title = "Keep the title under 200 characters.";
	if (input.body.length > 200_000) errors.body = "That message is too long.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

export function create(user: User, projectId: number, input: MessageInput): number {
	const access = loadProjectAsTeam(user, projectId);
	validate(input);
	const row = insertMessage.get(
		projectId, user.id, input.title.trim(), input.body, input.category.trim().slice(0, 40), input.clientVisible ? 1 : 0,
	);
	if (!row) throw new Error("insert failed");
	const url = `/projects/${projectId}/messages/${row.id}`;
	subscribe.run("message", row.id, user.id);
	record({
		projectId, actorId: user.id, action: "posted", type: "message", id: row.id,
		title: input.title.trim(), excerpt: input.body, url, clientVisible: input.clientVisible,
	});
	const mentioned = new Set(
		notifyMentions(input.body, {
			projectId, actorId: user.id, kind: "message", title: input.title.trim(), url, clientVisible: input.clientVisible,
		}),
	);
	notify(
		listMembers.all(projectId).map((m) => m.userId).filter((id) => !mentioned.has(id)),
		{
			projectId, actorId: user.id, kind: "message", title: `${access.project.name}: ${input.title.trim()}`,
			excerpt: input.body, url, clientVisible: input.clientVisible,
		},
	);
	return row.id;
}

function editable(user: User, projectId: number, id: number) {
	loadProjectAsTeam(user, projectId);
	const row = findMessage.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	if (row.authorId !== user.id && !isAdmin(user)) throw new ForbiddenError("Only the author can edit this message.");
	return row;
}

export function update(user: User, projectId: number, id: number, input: MessageInput): void {
	editable(user, projectId, id);
	validate(input);
	updateMessage.run(
		input.title.trim(), input.body, input.category.trim().slice(0, 40), input.clientVisible ? 1 : 0, nowIso(), id,
	);
}

export function pin(user: User, projectId: number, id: number, pinned: boolean): void {
	loadProjectAsTeam(user, projectId);
	const row = findMessage.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	setMessagePinned.run(pinned ? 1 : 0, id);
}

export function remove(user: User, projectId: number, id: number): void {
	editable(user, projectId, id);
	deleteMessage.run(id);
	deleteCommentsFor.run("message", id);
	deleteActivitiesFor.run("message", id);
}
