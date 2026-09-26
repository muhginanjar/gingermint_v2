/**
 * Resolve any recordable (message, to-do, card, doc, …) to the facts other
 * features need: owning project, display title, canonical URL, whether
 * clients can see it, and who created it. Used by comments, reactions,
 * subscriptions, bookmarks and Bubble Up.
 */
import type { RecordableType } from "../../shared/models";
import { findCard } from "../queries/cards";
import { findChatLine } from "../queries/chat";
import { findAnswer, findQuestion } from "../queries/checkins";
import { findComment } from "../queries/comments";
import { findEvent } from "../queries/events";
import { findMessage } from "../queries/messages";
import { findTodo, findTodoList } from "../queries/todos";
import { findVaultItem } from "../queries/vault";

export interface Resolved {
	type: RecordableType;
	id: number;
	projectId: number;
	title: string;
	url: string;
	clientVisible: boolean;
	creatorId: number | null;
}

export function recordableUrl(type: string, id: number, projectId: number, extra?: number | null): string {
	const base = `/projects/${projectId}`;
	switch (type) {
		case "message":
			return `${base}/messages/${id}`;
		case "todo":
			return `${base}/todos/${id}`;
		case "todo_list":
			return `${base}/todos/lists/${id}`;
		case "card":
			return `${base}/cards/${id}`;
		case "doc":
		case "file":
		case "link":
			return `${base}/docs/${id}`;
		case "folder":
			return `${base}/docs/folders/${id}`;
		case "event":
			return `${base}/schedule/${id}`;
		case "checkin_question":
			return `${base}/checkins/${id}`;
		case "checkin_answer":
			return `${base}/checkins/answers/${id}`;
		case "chat_line":
			return `${base}/chat#line-${id}`;
		case "forward":
			return `/everything/forwards#forward-${id}`;
		case "project":
			return base;
		default:
			return extra ? `${base}#${type}-${extra}` : base;
	}
}

export function resolve(type: string, id: number): Resolved | null {
	switch (type) {
		case "message": {
			const r = findMessage.get(id);
			return r && {
				type, id, projectId: r.projectId, title: r.title, url: recordableUrl(type, id, r.projectId),
				clientVisible: r.clientVisible === 1, creatorId: r.authorId,
			};
		}
		case "todo": {
			const r = findTodo.get(id);
			if (!r) return null;
			const list = r.listId ? findTodoList.get(r.listId) : null;
			return {
				type, id, projectId: r.projectId, title: r.title, url: recordableUrl(type, id, r.projectId),
				clientVisible: list?.clientVisible === 1, creatorId: r.createdBy,
			};
		}
		case "todo_list": {
			const r = findTodoList.get(id);
			return r && {
				type, id, projectId: r.projectId, title: r.name, url: recordableUrl(type, id, r.projectId),
				clientVisible: r.clientVisible === 1, creatorId: null,
			};
		}
		case "card": {
			const r = findCard.get(id);
			return r && {
				type, id, projectId: r.projectId, title: r.title, url: recordableUrl(type, id, r.projectId),
				clientVisible: false, creatorId: r.createdBy,
			};
		}
		case "doc":
		case "file":
		case "link":
		case "folder": {
			const r = findVaultItem.get(id);
			return r && {
				type: r.kind as RecordableType, id, projectId: r.projectId, title: r.title,
				url: recordableUrl(r.kind, id, r.projectId), clientVisible: r.clientVisible === 1, creatorId: r.createdBy,
			};
		}
		case "event": {
			const r = findEvent.get(id);
			return r && {
				type, id, projectId: r.projectId, title: r.title, url: recordableUrl(type, id, r.projectId),
				clientVisible: r.clientVisible === 1, creatorId: r.createdBy,
			};
		}
		case "checkin_question": {
			const r = findQuestion.get(id);
			return r && {
				type, id, projectId: r.projectId, title: r.question, url: recordableUrl(type, id, r.projectId),
				clientVisible: false, creatorId: r.createdBy,
			};
		}
		case "checkin_answer": {
			const r = findAnswer.get(id);
			if (!r) return null;
			const q = findQuestion.get(r.questionId);
			return {
				type, id, projectId: r.projectId, title: q?.question ?? "Check-in answer",
				url: recordableUrl(type, id, r.projectId), clientVisible: false, creatorId: r.authorId,
			};
		}
		case "chat_line": {
			const r = findChatLine.get(id);
			return r && {
				type, id, projectId: r.projectId, title: "Chat", url: recordableUrl(type, id, r.projectId),
				clientVisible: false, creatorId: r.authorId,
			};
		}
		case "comment": {
			const r = findComment.get(id);
			if (!r) return null;
			const parent = resolve(r.recordableType, r.recordableId);
			return parent && { ...parent, type: "comment", id, url: `${parent.url}#comment-${id}`, creatorId: r.authorId };
		}
		default:
			return null;
	}
}
