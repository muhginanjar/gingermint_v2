/** Latest Activity: Timeline (filter by project/person) and Wrap-up. */
import { between, timeline } from "../services/activity";
import { visibleProjects } from "../services/projects";
import { allPeople } from "../services/people";
import { addDays, isDateStr, today } from "../services/time";
import { type Ctx, me, num, render } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	const view = c.req.query("view") === "wrapup" ? "wrapup" : "timeline";
	const projectId = num(c.req.query("project")) ?? 0;
	const personId = num(c.req.query("person")) ?? 0;
	const before = c.req.query("before");
	const props: Record<string, unknown> = {
		view,
		filters: { projectId, personId },
		projects: visibleProjects(user).map((p) => ({ id: p.id, name: p.name })),
		people: allPeople(user.accountId),
	};
	if (view === "timeline") {
		props.activities = timeline(user, { projectId, actorId: personId, before: before || undefined, limit: 80 });
	} else {
		const to = c.req.query("to");
		const end = to && isDateStr(to) ? to : today();
		const start = addDays(end, -6);
		props.range = { from: start, to: end };
		props.activities = between(user, `${start}T00:00:00`, `${addDays(end, 1)}T00:00:00`, projectId);
	}
	return render(c, "activity/Index", props, { title: "Latest Activity", kind: "activity" });
}

/** JSON: older timeline rows (infinite scroll). */
export function more(c: Ctx) {
	const user = me(c);
	return c.json({
		activities: timeline(user, {
			projectId: num(c.req.query("project")) ?? 0,
			actorId: num(c.req.query("person")) ?? 0,
			before: c.req.query("before") || undefined,
			limit: 80,
		}),
	});
}
