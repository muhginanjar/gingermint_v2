/** Project Schedule, event pages, global Calendar, ICS feed, reminders. */
import * as schedule from "../services/schedule";
import { assignablePeople } from "../services/access";
import { commentsFor, isSubscribed } from "../services/comments";
import { isBookmarked } from "../services/inbox";
import { projectRef, visibleProjects } from "../services/projects";
import { loadProject, assertTool } from "../services/access";
import { isDateStr, today } from "../services/time";
import { config } from "../config";
import { back, body, bool, type Ctx, id, ids, me, num, redirect, render, str } from "./http";

const eventInput = (b: Record<string, unknown>): schedule.EventInput => ({
	title: str(b.title, 200),
	notes: str(b.notes),
	startsAt: str(b.startsAt, 40),
	endsAt: str(b.endsAt, 40),
	allDay: bool(b.allDay),
	videoUrl: str(b.videoUrl, 500),
	location: str(b.location, 200),
	clientVisible: bool(b.clientVisible),
	participantIds: ids(b.participantIds),
});

function query(c: Ctx, projectId: number | null): schedule.CalendarQuery {
	const from = c.req.query("from");
	const weeks = Math.min(26, Math.max(1, num(c.req.query("weeks")) ?? 6));
	return {
		from: from && isDateStr(from) ? from : today(),
		days: weeks * 7,
		projectId,
		who: c.req.query("who") === "mine" ? "mine" : "everyone",
		include: c.req.query("include") === "events" ? "events" : "events_tasks",
	};
}

export function projectSchedule(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const access = loadProject(user, projectId);
	assertTool(access, "schedule");
	const q = query(c, projectId);
	return render(
		c,
		"schedule/Index",
		{ project: projectRef(access), entries: schedule.entries(user, q), query: q, people: assignablePeople(projectId) },
		{ title: "Schedule", kind: "schedule", context: access.project.name },
	);
}

export function calendar(c: Ctx) {
	const user = me(c);
	const pid = num(c.req.query("project"));
	const q = query(c, pid);
	return render(
		c,
		"calendar/Index",
		{
			entries: schedule.entries(user, q),
			query: q,
			projects: visibleProjects(user).map((p) => ({ id: p.id, name: p.name, color: p.color })),
			feedUrl: `${config.appUrl}/calendar/feed/${schedule.calendarToken(user)}.ics`,
		},
		{ title: "Calendar", kind: "calendar" },
	);
}

export function rotateFeed(c: Ctx) {
	const user = me(c);
	schedule.calendarToken(user, true);
	return back(c, "/calendar", { success: "New subscription link created. The old one stops working." });
}

export function feed(c: Ctx) {
	const token = (c.req.param("token") ?? "").replace(/\.ics$/, "");
	const ics = schedule.icsFeed(token, config.appUrl);
	if (!ics) return c.text("Not found", 404);
	return new Response(ics, {
		headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=300" },
	});
}

export function newPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const access = loadProject(user, projectId);
	assertTool(access, "schedule");
	return render(c, "schedule/Form", {
		project: projectRef(access),
		event: null,
		date: c.req.query("date") ?? today(),
		people: assignablePeople(projectId),
	});
}

export function editPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, event } = schedule.showEvent(user, projectId, id(c));
	return render(c, "schedule/Form", { project: projectRef(access), event, date: null, people: assignablePeople(projectId) });
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, event } = schedule.showEvent(user, projectId, id(c));
	return render(
		c,
		"schedule/Show",
		{
			project: projectRef(access),
			event,
			comments: commentsFor(user, "event", event.id),
			subscribed: isSubscribed(user.id, "event", event.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/schedule/${event.id}`),
			people: assignablePeople(projectId),
		},
		{ title: event.title, kind: "event", context: access.project.name },
	);
}

export async function create(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const eventId = schedule.createEvent(user, projectId, eventInput(await body(c)));
	return redirect(c, `/projects/${projectId}/schedule/${eventId}`, { success: "Event scheduled." });
}

export async function update(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	schedule.updateEventItem(user, projectId, id(c), eventInput(await body(c)));
	return redirect(c, `/projects/${projectId}/schedule/${id(c)}`, { success: "Event updated." });
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	schedule.removeEvent(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/schedule`, { success: "Event removed." });
}

/** JSON: events starting in ≤15 minutes (polled by the reminder banner). */
export function reminders(c: Ctx) {
	const user = me(c);
	return c.json({ events: schedule.upcomingReminders(user, 15) });
}
