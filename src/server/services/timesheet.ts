/** Timesheet: log time against a project (optionally a to-do) + report totals. */
import type { TimeEntry } from "../../shared/models";
import type { User } from "../../shared/types";
import { findTodo } from "../queries/todos";
import { deleteEntry, findEntry, insertEntry, listEntriesBetween, listProjectEntries, type TimeEntryRow } from "../queries/timesheet";
import { assertTool, isAdmin, loadProjectAsTeam, scopeFor } from "./access";
import { record } from "./activity";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { personMap, pick } from "./people";
import { addDays, isDateStr, today } from "./time";

function toEntries(rows: TimeEntryRow[]): TimeEntry[] {
	const people = personMap();
	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		projectName: r.projectName,
		person: pick(people, r.userId),
		todo: r.todoId ? { id: r.todoId, title: r.todoTitle ?? "" } : null,
		date: r.date,
		minutes: r.minutes,
		description: r.description,
	}));
}

export function projectSheet(user: User, projectId: number, from?: string, to?: string) {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "timesheet");
	const end = to && isDateStr(to) ? to : today();
	const start = from && isDateStr(from) ? from : addDays(end, -30);
	return { access, from: start, to: end, entries: toEntries(listProjectEntries.all(projectId, start, end)) };
}

export function report(user: User, from: string, to: string, personId = 0): TimeEntry[] {
	const scope = scopeFor(user);
	return toEntries(listEntriesBetween.all(from, to, scope.full, personId));
}

/** Parse "1:30", "1.5", "90m", "2h" into minutes. */
export function parseDuration(input: string): number | null {
	const s = input.trim().toLowerCase();
	const clock = s.match(/^(\d+):([0-5]\d)$/);
	if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
	const hours = s.match(/^(\d+(?:\.\d+)?)\s*h$/);
	if (hours) return Math.round(Number(hours[1]) * 60);
	const mins = s.match(/^(\d+)\s*m(in)?$/);
	if (mins) return Number(mins[1]);
	const plain = s.match(/^(\d+(?:\.\d+)?)$/);
	if (plain) return Math.round(Number(plain[1]) * 60);
	return null;
}

export function logTime(
	user: User,
	projectId: number,
	input: { date: string; duration: string; description: string; todoId: number | null; personId: number | null },
): number {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "timesheet");
	const errors: Record<string, string> = {};
	const minutes = parseDuration(input.duration);
	if (!isDateStr(input.date)) errors.date = "Pick a date.";
	if (!minutes || minutes <= 0 || minutes > 24 * 60) errors.duration = "Enter time like 1:30, 1.5 or 90m.";
	if (Object.keys(errors).length) throw new InputError(errors);
	let todoId: number | null = null;
	if (input.todoId) {
		const todo = findTodo.get(input.todoId);
		if (!todo || todo.projectId !== projectId) throw new InputError({ todoId: "Pick a to-do from this project." });
		todoId = todo.id;
	}
	const personId = input.personId && isAdmin(user) ? input.personId : user.id;
	const row = insertEntry.get(projectId, personId, todoId, input.date, minutes ?? 0, input.description.trim().slice(0, 500));
	if (!row) throw new Error("insert failed");
	record({
		projectId, actorId: user.id, action: "logged time on", type: "time_entry", id: row.id,
		title: input.description.trim() || "Timesheet", excerpt: `${Math.floor((minutes ?? 0) / 60)}h ${(minutes ?? 0) % 60}m`,
		url: `/projects/${projectId}/timesheet`,
	});
	return row.id;
}

export function removeTime(user: User, projectId: number, id: number): void {
	loadProjectAsTeam(user, projectId);
	const e = findEntry.get(id);
	if (!e || e.projectId !== projectId) throw new NotFoundError();
	if (e.userId !== user.id && !isAdmin(user)) throw new ForbiddenError();
	deleteEntry.run(id);
}
