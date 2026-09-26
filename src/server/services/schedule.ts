/**
 * Schedule & Calendar: project events, the global calendar (Next 6 weeks,
 * All projects / one project, Mine / Everyone, Events or Events + tasks),
 * the private ICS subscription feed, and upcoming-event reminders.
 */
import { randomBytes } from "node:crypto";
import type { CalendarEntry, CalendarEvent, Color, Person } from "../../shared/models";
import type { User } from "../../shared/types";
import { deleteActivitiesFor } from "../queries/activities";
import { listAssignedCards, listCardAssignees, listDueCards } from "../queries/cards";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import {
	addEventParticipant,
	clearEventParticipants,
	deleteEvent,
	type EventRow,
	findEvent,
	insertEvent,
	listEventParticipants,
	listEventsBetween,
	updateEvent,
} from "../queries/events";
import { findCalendarToken, findPersonByCalendarToken, setCalendarToken } from "../queries/people";
import { findUserById } from "../db";
import { listMemberships } from "../queries/accounts";
import { userInAccount } from "./accounts";
import { listAssignedTodos, listDueTodos, listTodoAssignees } from "../queries/todos";
import { assertTool, assignableIds, loadProject, loadProjectAsTeam, scopeFor } from "./access";
import { record } from "./activity";
import { InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { addDays, isDateStr, nowIso, today } from "./time";

const color = (c: string) => c as Color;

function toEvents(rows: EventRow[], people = personMap()): CalendarEvent[] {
	const parts = new Map<number, Person[]>();
	if (rows.length) {
		for (const p of listEventParticipants.all(JSON.stringify(rows.map((r) => r.id)))) {
			const person = people.get(p.userId);
			if (person) parts.set(p.eventId, [...(parts.get(p.eventId) ?? []), person]);
		}
	}
	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		projectName: r.projectName,
		projectColor: color(r.projectColor),
		title: r.title,
		notes: r.notes,
		startsAt: r.startsAt,
		endsAt: r.endsAt,
		allDay: r.allDay === 1,
		videoUrl: r.videoUrl,
		location: r.location,
		clientVisible: r.clientVisible === 1,
		participants: parts.get(r.id) ?? [],
		commentCount: r.commentCount,
		createdBy: pick(people, r.createdBy),
	}));
}

export interface CalendarQuery {
	from: string; // YYYY-MM-DD
	days: number;
	projectId: number | null;
	who: "everyone" | "mine";
	include: "events" | "events_tasks";
}

/** Calendar entries for a window. Server pads ±1 day; the client groups by local date. */
export function entries(user: User, q: CalendarQuery): CalendarEntry[] {
	const scope = scopeFor(user);
	let full = scope.fullIds;
	let client = scope.clientIds;
	if (q.projectId) {
		full = full.filter((id) => id === q.projectId);
		client = client.filter((id) => id === q.projectId);
	}
	// Pad a week back (month grids start on the Sunday before the 1st) and a
	// day forward (timezones); the client groups by its local date.
	const from = addDays(q.from, -7);
	const to = addDays(q.from, q.days + 1);
	const people = personMap();
	let events = toEvents(listEventsBetween.all(from, `${to}T99`, JSON.stringify(full), JSON.stringify(client)), people);
	if (q.who === "mine") {
		events = events.filter(
			(e) => e.participants.some((p) => p.id === user.id) || e.createdBy?.id === user.id,
		);
	}
	const out: CalendarEntry[] = events.map((e) => ({
		kind: "event",
		id: e.id,
		title: e.title,
		startsAt: e.startsAt,
		endsAt: e.endsAt,
		allDay: e.allDay,
		projectId: e.projectId,
		projectName: e.projectName,
		color: e.projectColor,
		url: `/projects/${e.projectId}/schedule/${e.id}`,
		people: e.participants,
		videoUrl: e.videoUrl,
		completed: false,
	}));
	if (q.include === "events_tasks" && full.length) {
		const fullJson = JSON.stringify(full);
		const todos = listDueTodos.all(from, to, fullJson);
		const todoPeople = new Map<number, Person[]>();
		if (todos.length) {
			for (const a of listTodoAssignees.all(JSON.stringify(todos.map((t) => t.id)))) {
				const p = people.get(a.userId);
				if (p) todoPeople.set(a.todoId, [...(todoPeople.get(a.todoId) ?? []), p]);
			}
		}
		for (const t of todos) {
			const assigned = todoPeople.get(t.id) ?? [];
			if (q.who === "mine" && !assigned.some((p) => p.id === user.id)) continue;
			out.push({
				kind: "todo",
				id: t.id,
				title: t.title,
				startsAt: t.dueOn ?? "",
				endsAt: t.dueOn ?? "",
				allDay: true,
				projectId: t.projectId,
				projectName: t.projectName,
				color: color(t.projectColor),
				url: `/projects/${t.projectId}/todos/${t.id}`,
				people: assigned,
				videoUrl: "",
				completed: t.completedAt !== null,
			});
		}
		const cards = listDueCards.all(from, to, fullJson);
		const cardPeople = new Map<number, Person[]>();
		if (cards.length) {
			for (const a of listCardAssignees.all(JSON.stringify(cards.map((c) => c.id)))) {
				const p = people.get(a.userId);
				if (p) cardPeople.set(a.cardId, [...(cardPeople.get(a.cardId) ?? []), p]);
			}
		}
		for (const c of cards) {
			const assigned = cardPeople.get(c.id) ?? [];
			if (q.who === "mine" && !assigned.some((p) => p.id === user.id)) continue;
			out.push({
				kind: "card",
				id: c.id,
				title: c.title,
				startsAt: c.dueOn ?? "",
				endsAt: c.dueOn ?? "",
				allDay: true,
				projectId: c.projectId,
				projectName: c.projectName,
				color: color(c.projectColor),
				url: `/projects/${c.projectId}/cards/${c.id}`,
				people: assigned,
				videoUrl: "",
				completed: false,
			});
		}
	}
	return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function showEvent(user: User, projectId: number, id: number) {
	const access = loadProject(user, projectId);
	assertTool(access, "schedule");
	const row = findEvent.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	if (access.isClient && row.clientVisible !== 1) throw new NotFoundError();
	const [event] = toEvents([row]);
	if (!event) throw new NotFoundError();
	return { access, event };
}

export interface EventInput {
	title: string;
	notes: string;
	startsAt: string;
	endsAt: string;
	allDay: boolean;
	videoUrl: string;
	location: string;
	clientVisible: boolean;
	participantIds: number[];
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function validate(input: EventInput): void {
	const errors: Record<string, string> = {};
	if (!input.title.trim()) errors.title = "Name the event.";
	if (input.allDay) {
		if (!isDateStr(input.startsAt)) errors.startsAt = "Pick a start date.";
		if (!isDateStr(input.endsAt)) errors.endsAt = "Pick an end date.";
	} else {
		if (!ISO.test(input.startsAt) || Number.isNaN(Date.parse(input.startsAt))) errors.startsAt = "Pick a start time.";
		if (!ISO.test(input.endsAt) || Number.isNaN(Date.parse(input.endsAt))) errors.endsAt = "Pick an end time.";
	}
	if (!errors.startsAt && !errors.endsAt && input.endsAt < input.startsAt) errors.endsAt = "The event must end after it starts.";
	if (input.videoUrl && !/^https:\/\//i.test(input.videoUrl)) errors.videoUrl = "Use an https:// meeting link.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

const normalize = (input: EventInput) => ({
	startsAt: input.allDay ? input.startsAt : new Date(input.startsAt).toISOString(),
	endsAt: input.allDay ? input.endsAt : new Date(input.endsAt).toISOString(),
});

function setParticipants(projectId: number, eventId: number, ids: number[]): number[] {
	const allowed = assignableIds(projectId);
	clearEventParticipants.run(eventId);
	const out = [...new Set(ids)].filter((id) => allowed.has(id));
	for (const id of out) addEventParticipant.run(eventId, id);
	return out;
}

export function createEvent(user: User, projectId: number, input: EventInput): number {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "schedule");
	validate(input);
	const { startsAt, endsAt } = normalize(input);
	const row = insertEvent.get(
		projectId, input.title.trim(), input.notes, startsAt, endsAt, input.allDay ? 1 : 0, input.videoUrl.trim(),
		input.location.trim(), input.clientVisible ? 1 : 0, user.id,
	);
	if (!row) throw new Error("insert failed");
	const people = setParticipants(projectId, row.id, input.participantIds);
	subscribe.run("event", row.id, user.id);
	const url = `/projects/${projectId}/schedule/${row.id}`;
	record({
		projectId, actorId: user.id, action: "scheduled", type: "event", id: row.id, title: input.title.trim(), url,
		clientVisible: input.clientVisible,
	});
	notify(people, {
		projectId, actorId: user.id, kind: "event", title: `You're invited: ${input.title.trim()}`, url,
		clientVisible: input.clientVisible,
	});
	notifyMentions(input.notes, { projectId, actorId: user.id, kind: "event", title: input.title.trim(), url });
	return row.id;
}

export function updateEventItem(user: User, projectId: number, id: number, input: EventInput): void {
	loadProjectAsTeam(user, projectId);
	const row = findEvent.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	validate(input);
	const { startsAt, endsAt } = normalize(input);
	updateEvent.run(
		input.title.trim(), input.notes, startsAt, endsAt, input.allDay ? 1 : 0, input.videoUrl.trim(),
		input.location.trim(), input.clientVisible ? 1 : 0, nowIso(), id,
	);
	const people = setParticipants(projectId, id, input.participantIds);
	if (row.startsAt !== startsAt || row.endsAt !== endsAt) {
		const url = `/projects/${projectId}/schedule/${id}`;
		record({ projectId, actorId: user.id, action: "rescheduled", type: "event", id, title: input.title.trim(), url });
		notify(people, { projectId, actorId: user.id, kind: "event", title: `Rescheduled: ${input.title.trim()}`, url });
	}
}

export function removeEvent(user: User, projectId: number, id: number): void {
	loadProjectAsTeam(user, projectId);
	const row = findEvent.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError();
	deleteEvent.run(id);
	deleteCommentsFor.run("event", id);
	deleteActivitiesFor.run("event", id);
}

// ---------------------------------------------------------------------------
// Reminders + My Events
// ---------------------------------------------------------------------------

/** Timed events starting within the next `minutes` that involve the viewer. */
export function upcomingReminders(user: User, minutes = 15): CalendarEvent[] {
	const scope = scopeFor(user);
	const now = new Date();
	const until = new Date(now.getTime() + minutes * 60_000).toISOString();
	return toEvents(listEventsBetween.all(now.toISOString(), until, scope.full, scope.client)).filter(
		(e) =>
			!e.allDay &&
			e.startsAt >= now.toISOString() &&
			(e.participants.length === 0 ? e.createdBy?.id === user.id : e.participants.some((p) => p.id === user.id)),
	);
}

export function myEvents(user: User, days = 14): CalendarEntry[] {
	return entries(user, { from: today(), days, projectId: null, who: "mine", include: "events" });
}

/** Open to-dos + cards assigned to `personId` (default: the viewer), within the viewer's scope. */
export function myAssignments(user: User, personId = user.id) {
	const scope = scopeFor(user);
	const todos = listAssignedTodos.all(personId, scope.full).map((t) => ({
		kind: "todo" as const,
		id: t.id,
		title: t.title,
		dueOn: t.dueOn,
		projectName: t.projectName,
		url: `/projects/${t.projectId}/todos/${t.id}`,
	}));
	const cards = listAssignedCards.all(personId, scope.full).map((c) => ({
		kind: "card" as const,
		id: c.id,
		title: c.title,
		dueOn: c.dueOn,
		projectName: c.projectName,
		url: `/projects/${c.projectId}/cards/${c.id}`,
	}));
	return [...todos, ...cards].sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
}

// ---------------------------------------------------------------------------
// ICS subscription feed
// ---------------------------------------------------------------------------

export function calendarToken(user: User, rotate = false): string {
	const existing = findCalendarToken.get(user.id)?.calendarToken;
	if (existing && !rotate) return existing;
	const token = randomBytes(20).toString("hex");
	setCalendarToken.run(token, user.id);
	return token;
}

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, ";").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsDate = (d: string) => d.replace(/-/g, "");

export function icsFeed(token: string, baseUrl: string): string | null {
	if (!/^[a-f0-9]{40}$/.test(token)) return null;
	const person = findPersonByCalendarToken.get(token);
	const row = person ? findUserById.get(person.id) : null;
	if (!row) return null;
	// One feed covers every workspace the person belongs to.
	const list: (CalendarEntry & { viewerId: number })[] = [];
	for (const m of listMemberships.all(row.id)) {
		const user = userInAccount(row, m.id);
		if (!user) continue;
		for (const e of entries(user, { from: addDays(today(), -30), days: 210, projectId: null, who: "everyone", include: "events_tasks" }))
			list.push({ ...e, viewerId: user.id });
	}
	const user = { id: row.id };
	const stamp = icsStamp(nowIso());
	const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GingerMint//Calendar//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:GingerMint"];
	for (const e of list) {
		if (e.kind !== "event" && !e.people.some((p) => p.id === user.id)) continue;
		lines.push("BEGIN:VEVENT", `UID:${e.kind}-${e.id}@gingermint`, `DTSTAMP:${stamp}`);
		if (e.allDay) {
			lines.push(`DTSTART;VALUE=DATE:${icsDate(e.startsAt)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.endsAt.slice(0, 10), 1))}`);
		} else {
			lines.push(`DTSTART:${icsStamp(new Date(e.startsAt).toISOString())}`, `DTEND:${icsStamp(new Date(e.endsAt).toISOString())}`);
		}
		const prefix = e.kind === "todo" ? "☐ " : e.kind === "card" ? "▣ " : "";
		lines.push(
			`SUMMARY:${icsEscape(prefix + e.title)}`,
			`DESCRIPTION:${icsEscape(`${e.projectName}${e.videoUrl ? `\nJoin: ${e.videoUrl}` : ""}`)}`,
			`URL:${baseUrl}${e.url}`,
			"END:VEVENT",
		);
	}
	lines.push("END:VCALENDAR");
	return `${lines.join("\r\n")}\r\n`;
}
