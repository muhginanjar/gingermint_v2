/**
 * Discovery across projects: universal search (Jump menu + search page),
 * Everything views, Reports (overdue, assignments, upcoming, timesheet)
 * and The Lineup.
 */
import type { SearchResult } from "../../shared/models";
import { toPlainText } from "../../shared/markdown";
import type { User } from "../../shared/types";
import {
	completedBetween,
	everythingCheckins,
	everythingComments,
	everythingFiles,
	everythingForwards,
	everythingMessages,
	type EverythingRow,
	openAssignmentsByPerson,
	overdueAssignees,
	overdueItems,
	searchAll,
} from "../queries/everything";
import { searchAccountPeople } from "../queries/people";
import { scopeArgs, scopeFor } from "./access";
import { attachmentMap } from "./attachments";
import { summarize } from "./projects";
import { personMap, pick, type toPerson } from "./people";
import { recordableUrl } from "./recordables";
import { addDays, today } from "./time";
import { listVisibleProjects } from "../queries/projects";

/** Escape LIKE wildcards; the queries use ESCAPE '\'. */
export const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const LABEL: Record<string, string> = {
	project: "Project",
	message: "Message",
	todo: "To-do",
	card: "Card",
	doc: "Document",
	file: "File",
	link: "Link",
	folder: "Folder",
	event: "Event",
	comment: "Comment",
	chat_line: "Chat",
	checkin_answer: "Check-in",
	person: "Person",
};

export function search(user: User, q: string, limit = 30): SearchResult[] {
	const text = q.trim();
	if (text.length < 1) return [];
	const scope = scopeFor(user);
	const pattern = likePattern(text);
	const people = searchAccountPeople.all(user.accountId, pattern, pattern, 5).map((p) => ({
		kind: "person",
		id: p.id,
		title: p.name,
		excerpt: p.title || p.email,
		url: `/people/${p.id}`,
		context: "Person",
		createdAt: p.createdAt,
	}));
	const rows = searchAll.all(scope.full, scope.client, pattern, limit);
	const results = rows.map((r) => {
		let url: string;
		if (r.kind === "project") url = `/projects/${r.id}`;
		else if (r.kind === "comment") url = `${recordableUrl(r.parentType ?? "", r.parentId ?? 0, r.projectId ?? 0)}#comment-${r.id}`;
		else url = recordableUrl(r.kind, r.id, r.projectId ?? 0);
		const title = r.title || toPlainText(r.body, 80);
		return {
			kind: r.kind,
			id: r.id,
			title,
			excerpt: toPlainText(r.body, 140),
			url,
			context: `${LABEL[r.kind] ?? r.kind} · ${r.context}`,
			createdAt: r.createdAt,
		};
	});
	return [...people, ...results];
}

// ---------------------------------------------------------------------------
// Everything
// ---------------------------------------------------------------------------

export const EVERYTHING_KINDS = ["messages", "files", "comments", "checkins", "forwards"] as const;
export type EverythingKind = (typeof EVERYTHING_KINDS)[number];

export interface EverythingItem {
	id: number;
	title: string;
	excerpt: string;
	body: string;
	url: string;
	projectName: string;
	author: ReturnType<typeof pick>;
	kind: string;
	fileUrl: string | null;
	mime: string | null;
	createdAt: string;
}

export function everything(user: User, kind: EverythingKind, filter: string): EverythingItem[] {
	const scope = scopeFor(user);
	const pattern = likePattern(filter.trim());
	const query = {
		messages: everythingMessages,
		files: everythingFiles,
		comments: everythingComments,
		checkins: everythingCheckins,
		forwards: everythingForwards,
	}[kind];
	const rows: EverythingRow[] = query.all(scope.full, scope.client, pattern, 200);
	const people = personMap();
	const files = kind === "files" ? attachmentMap(rows.map((r) => r.parentType)) : new Map();
	return rows.map((r) => {
		let url: string;
		if (kind === "comments") url = `${recordableUrl(r.parentType ?? "", r.parentId ?? 0, r.projectId)}#comment-${r.id}`;
		else if (kind === "checkins") url = recordableUrl("checkin_answer", r.id, r.projectId);
		else if (kind === "forwards") url = `/everything/forwards#forward-${r.id}`;
		else url = recordableUrl(r.kind, r.id, r.projectId);
		const att = kind === "files" && r.parentType ? files.get(r.parentType) : null;
		return {
			id: r.id,
			title: r.title || toPlainText(r.body, 80),
			excerpt: toPlainText(r.body, 220),
			body: kind === "forwards" ? r.body : "",
			url,
			projectName: r.projectName,
			author: kind === "forwards" ? null : pick(people, r.authorId),
			kind: kind === "forwards" ? `From ${r.parentType ?? ""}` : r.kind,
			fileUrl: att?.url ?? null,
			mime: att?.mime ?? null,
			createdAt: r.createdAt,
		};
	});
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function overdue(user: User) {
	const scope = scopeFor(user);
	const rows = overdueItems.all(today(), scope.full);
	const people = personMap();
	const assignees = new Map<number, ReturnType<typeof toPerson>[]>();
	const todoIds = rows.filter((r) => r.kind === "todo").map((r) => r.id);
	if (todoIds.length) {
		for (const a of overdueAssignees.all(JSON.stringify(todoIds))) {
			const p = people.get(a.userId);
			if (p) assignees.set(a.todoId, [...(assignees.get(a.todoId) ?? []), p]);
		}
	}
	return rows.map((r) => ({
		...r,
		url: recordableUrl(r.kind, r.id, r.projectId),
		daysLate: Math.round((Date.parse(today()) - Date.parse(r.dueOn)) / 86_400_000),
		assignees: r.kind === "todo" ? (assignees.get(r.id) ?? []) : [],
	}));
}

export function workload(user: User) {
	const scope = scopeFor(user);
	const people = personMap();
	return openAssignmentsByPerson
		.all(today(), addDays(today(), 7), scope.full)
		.map((r) => ({ person: pick(people, r.userId), open: r.open, overdue: r.overdue, dueSoon: r.dueSoon }))
		.filter((r) => r.person)
		.sort((a, b) => b.open - a.open);
}

export function weeklyPulse(user: User) {
	const scope = scopeFor(user);
	const start = new Date(Date.now() - 7 * 86_400_000).toISOString();
	return { completedThisWeek: completedBetween.get(start, "9999", scope.full)?.n ?? 0 };
}

/** The Lineup: every dated project on one timeline. */
export function lineup(user: User) {
	const rows = listVisibleProjects.all(...scopeArgs(user));
	return summarize(rows).filter((p) => p.startOn || p.endOn);
}
