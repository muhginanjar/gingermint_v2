/** Search + Jump, Everything, Reports, Lineup, and person pages. */
import * as discovery from "../services/discovery";
import { timeline } from "../services/activity";
import { visibleProjects } from "../services/projects";
import { recentVisits } from "../services/inbox";
import { entries, myAssignments } from "../services/schedule";
import { report as timeReport } from "../services/timesheet";
import { allPeople, personById } from "../services/people";
import { addDays, isDateStr, today } from "../services/time";
import { NotFoundError } from "../services/errors";
import { isMember } from "../services/accounts";
import { type Ctx, id, me, num, render } from "./http";

/** JSON for the Jump menu: recent pages, projects, people and (with ?q) search hits. */
export function jump(c: Ctx) {
	const user = me(c);
	const q = (c.req.query("q") ?? "").trim();
	return c.json({
		recent: recentVisits(user, 8),
		projects: visibleProjects(user).map((p) => ({ id: p.id, name: p.name, icon: p.icon, color: p.color, folderId: p.folderId, starred: p.starred })),
		results: q ? discovery.search(user, q, 20) : [],
	});
}

export function search(c: Ctx) {
	const user = me(c);
	const q = (c.req.query("q") ?? "").trim();
	return render(c, "search/Index", { q, results: q ? discovery.search(user, q, 100) : [] }, { title: "Search", kind: "search" });
}

export function everything(c: Ctx) {
	const user = me(c);
	const raw = c.req.param("kind") ?? "messages";
	const kind = (discovery.EVERYTHING_KINDS as readonly string[]).includes(raw) ? (raw as discovery.EverythingKind) : "messages";
	const q = c.req.query("q") ?? "";
	return render(
		c,
		"everything/Index",
		{ kind, q, items: discovery.everything(user, kind, q) },
		{ title: "Everything", kind: "everything" },
	);
}

export function reports(c: Ctx) {
	const user = me(c);
	const raw = c.req.param("kind") ?? "overview";
	const props: Record<string, unknown> = { report: raw };
	switch (raw) {
		case "overdue":
			props.overdue = discovery.overdue(user);
			break;
		case "assignments": {
			const personId = num(c.req.query("person")) ?? user.id;
			props.workload = discovery.workload(user);
			props.person = personById(personId);
			props.assignments = myAssignments(user, personId);
			break;
		}
		case "upcoming":
			props.entries = entries(user, { from: today(), days: 21, projectId: null, who: "everyone", include: "events_tasks" });
			break;
		case "timesheet": {
			const to = c.req.query("to");
			const end = to && isDateStr(to) ? to : today();
			const from = c.req.query("from");
			const start = from && isDateStr(from) ? from : addDays(end, -30);
			const personId = num(c.req.query("person")) ?? 0;
			props.entries = timeReport(user, start, end, personId);
			props.range = { from: start, to: end };
			props.people = allPeople(user.accountId);
			props.personId = personId;
			break;
		}
		case "lineup":
			props.projects = discovery.lineup(user);
			break;
		default:
			props.report = "overview";
			props.overdueCount = discovery.overdue(user).length;
			props.workload = discovery.workload(user).slice(0, 6);
			props.pulse = discovery.weeklyPulse(user);
			props.lineupCount = discovery.lineup(user).length;
	}
	return render(c, "reports/Index", props, { title: "Reports", kind: "reports" });
}

export function person(c: Ctx) {
	const user = me(c);
	const p = personById(id(c));
	if (!p || !isMember(user.accountId, p.id)) throw new NotFoundError();
	return render(
		c,
		"people/Show",
		{ person: p, activity: timeline(user, { actorId: p.id, limit: 30 }), isMe: p.id === user.id },
		{ title: p.name, kind: "person" },
	);
}
