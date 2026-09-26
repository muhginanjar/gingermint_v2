/** Project Timesheet page + actions. */
import * as timesheet from "../services/timesheet";
import { assignablePeople, isAdmin } from "../services/access";
import { projectRef } from "../services/projects";
import { overview } from "../services/todos";
import { back, body, type Ctx, id, me, num, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const sheet = timesheet.projectSheet(user, projectId, c.req.query("from"), c.req.query("to"));
	const todos = overview(user, projectId).todos.filter((t) => !t.completedAt).map((t) => ({ id: t.id, title: t.title }));
	return render(
		c,
		"timesheet/Index",
		{
			project: projectRef(sheet.access),
			entries: sheet.entries,
			range: { from: sheet.from, to: sheet.to },
			todos,
			people: assignablePeople(projectId),
			canLogForOthers: isAdmin(user),
		},
		{ title: "Timesheet", kind: "timesheet", context: sheet.access.project.name },
	);
}

export async function create(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	timesheet.logTime(user, id(c, "projectId"), {
		date: str(b.date, 10),
		duration: str(b.duration, 20),
		description: str(b.description, 500),
		todoId: num(b.todoId),
		personId: num(b.personId),
	});
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	timesheet.removeTime(user, id(c, "projectId"), id(c));
	return back(c);
}
