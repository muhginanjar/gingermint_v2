/** Project page (toolbox), settings, tools, people & invitations, templates, integrations. */
import type { ProjectInput } from "../services/projects";
import * as projects from "../services/projects";
import * as integrations from "../services/integrations";
import { assignablePeople, isAdmin, loadProjectAsTeam } from "../services/access";
import { timeline } from "../services/activity";
import { allPeople } from "../services/people";
import { isBookmarked } from "../services/inbox";
import { overview as todoOverview } from "../services/todos";
import { board } from "../services/messages";
import { vault } from "../services/vault";
import { entries } from "../services/schedule";
import { recent } from "../services/chat";
import { table } from "../services/cards";
import { list as checkinList } from "../services/checkins";
import { projectSheet } from "../services/timesheet";
import { today } from "../services/time";
import { config } from "../config";
import { back, body, bool, type Ctx, id, ids, me, num, optStr, redirect, render, str, strs } from "./http";

function projectInput(b: Record<string, unknown>): ProjectInput {
	return {
		name: str(b.name, 120),
		description: str(b.description, 2000),
		icon: str(b.icon, 16),
		color: str(b.color, 20),
		folderId: num(b.folderId),
		leadId: num(b.leadId),
		phase: str(b.phase, 60),
		status: str(b.status, 20),
		startOn: optStr(b.startOn),
		endOn: optStr(b.endOn),
		access: str(b.access, 10),
	};
}

export function newPage(c: Ctx) {
	const user = me(c);
	return render(c, "projects/New", {
		folders: projects.folders(user.accountId),
		templates: projects.templates(user),
		templateId: num(c.req.query("template")),
	});
}

export async function create(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const projectId = projects.createProject(user, { ...projectInput(b), templateId: num(b.templateId) });
	return redirect(c, `/projects/${projectId}`, { success: "Project created. Invite people and add tools any time." });
}

/** Tool previews for the toolbox cards (small, cheap snapshots). */
function previews(c: Ctx, projectId: number) {
	const user = me(c);
	const detail = projects.projectDetail(user, projectId);
	const out: Record<string, unknown> = {};
	for (const tool of detail.tools) {
		try {
			switch (tool.kind) {
				case "message_board":
					out.message_board = board(user, projectId).messages.slice(0, 3);
					break;
				case "todos": {
					const o = todoOverview(user, projectId);
					out.todos = { lists: o.lists.slice(0, 4), loose: o.todos.filter((t) => !t.listId && !t.completedAt).slice(0, 4) };
					break;
				}
				case "docs":
					out.docs = vault(user, projectId).items.filter((i) => !i.parentId).slice(0, 6);
					break;
				case "schedule":
					out.schedule = entries(user, { from: today(), days: 30, projectId, who: "everyone", include: "events" }).slice(0, 4);
					break;
				case "chat":
					out.chat = recent(user, projectId).lines.slice(-3);
					break;
				case "card_table":
					out.card_table = table(user, projectId).columns.map((col) => ({ id: col.id, name: col.name, color: col.color, kind: col.kind, count: col.cards.length }));
					break;
				case "checkins":
					out.checkins = checkinList(user, projectId).questions.slice(0, 3);
					break;
				case "timesheet": {
					const sheet = projectSheet(user, projectId);
					out.timesheet = { minutes: sheet.entries.reduce((s, e) => s + e.minutes, 0), count: sheet.entries.length };
					break;
				}
			}
		} catch {
			/* tool hidden for this viewer */
		}
	}
	return { detail, previews: out };
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c);
	const { detail, previews: toolPreviews } = previews(c, projectId);
	return render(
		c,
		"projects/Show",
		{
			project: detail,
			previews: toolPreviews,
			activity: timeline(user, { projectId, limit: 6 }),
			folders: projects.folders(user.accountId),
			bookmarked: isBookmarked(user, `/projects/${projectId}`),
			canDelete: isAdmin(user) || detail.myRole !== "client",
		},
		{ title: detail.name, kind: "project", context: "Project" },
	);
}

export function editPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c);
	loadProjectAsTeam(user, projectId);
	return render(c, "projects/Edit", {
		project: projects.projectDetail(user, projectId),
		folders: projects.folders(user.accountId),
		people: allPeople(user.accountId),
	});
}

export async function update(c: Ctx) {
	const user = me(c);
	const projectId = id(c);
	projects.updateProjectSettings(user, projectId, projectInput(await body(c)));
	return redirect(c, `/projects/${projectId}`, { success: "Project updated." });
}

export async function setLogo(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const url = optStr(b.logoUrl);
	projects.setProjectLogo(user, id(c), url?.startsWith("/files/") ? url : null);
	return back(c);
}

export async function archive(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const archived = bool(b.archived);
	projects.archiveProject(user, id(c), archived);
	return redirect(c, archived ? "/home" : `/projects/${id(c)}`, {
		success: archived ? "Project archived. Find it in Adminland." : "Project restored.",
	});
}

export function destroy(c: Ctx) {
	const user = me(c);
	projects.destroyProject(user, id(c));
	return redirect(c, "/home", { success: "Project deleted." });
}

export async function star(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.toggleStar(user, id(c), bool(b.starred));
	return back(c);
}

export async function setNotify(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.setNotify(user, id(c), bool(b.on));
	return back(c);
}

export async function moveToFolder(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.moveToFolder(user, id(c), num(b.folderId));
	return back(c);
}

export function saveAsTemplate(c: Ctx) {
	const user = me(c);
	const templateId = projects.saveAsTemplate(user, id(c));
	return redirect(c, `/projects/${templateId}`, { success: "Saved as a template. Changes here won't affect the original." });
}

// Tools -----------------------------------------------------------------------

export async function addTool(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.addTool(user, id(c), str(b.kind, 30));
	return back(c);
}

export function removeTool(c: Ctx) {
	const user = me(c);
	projects.removeTool(user, id(c), id(c, "toolId"));
	return back(c);
}

export async function renameTool(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.renameProjectTool(user, id(c), id(c, "toolId"), str(b.name, 60));
	return back(c);
}

export async function reorderTools(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.reorderTools(user, id(c), ids(b.ids));
	return back(c);
}

// People ---------------------------------------------------------------------

export function peoplePage(c: Ctx) {
	const user = me(c);
	const projectId = id(c);
	const detail = projects.projectDetail(user, projectId);
	return render(
		c,
		"projects/People",
		{ project: detail, everyone: allPeople(user.accountId), assignable: assignablePeople(projectId) },
		{ title: `People on ${detail.name}`, kind: "people", context: detail.name },
	);
}

export async function invite(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const n = await projects.invite(user, id(c), {
		userIds: ids(b.userIds),
		emails: strs(b.emails),
		role: b.role === "client" ? "client" : "member",
	});
	return back(c, `/projects/${id(c)}/people`, { success: n === 1 ? "1 person added." : `${n} people added.` });
}

export function removePerson(c: Ctx) {
	const user = me(c);
	projects.removeFromProject(user, id(c), id(c, "personId"));
	return back(c);
}

// Integrations ------------------------------------------------------------------

export function integrationsPage(c: Ctx) {
	const user = me(c);
	const projectId = id(c);
	const detail = projects.projectDetail(user, projectId);
	loadProjectAsTeam(user, projectId);
	return render(c, "projects/Integrations", {
		project: detail,
		webhooks: integrations.webhooks(user, projectId),
		inboundUrl: `${config.appUrl}/inbound/${detail.inboundEmail.replace(/^project-/, "").split("@")[0]}`,
	});
}

export async function addWebhook(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	integrations.addWebhook(user, id(c), str(b.url, 500));
	return back(c);
}

export async function toggleWebhook(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	integrations.toggleWebhook(user, id(c), id(c, "hookId"), bool(b.active));
	return back(c);
}

export function removeWebhook(c: Ctx) {
	const user = me(c);
	integrations.removeWebhook(user, id(c), id(c, "hookId"));
	return back(c);
}

