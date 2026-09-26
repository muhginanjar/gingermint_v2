/**
 * Projects: Home screen data, project page, settings, tools (toolbox),
 * people & invitations, stars, folders, archive and templates.
 */
import { randomBytes } from "node:crypto";
import {
	COLORS,
	type Color,
	type Folder,
	type Person,
	type ProjectDetail,
	type ProjectRef,
	type ProjectSummary,
	type ProjectTool,
	TOOL_KINDS,
	type ToolKind,
} from "../../shared/models";
import type { User } from "../../shared/types";
import { createPasswordReset, hashPassword } from "../auth";
import { config } from "../config";
import { createUser } from "../db";
import { sendMail } from "../mailer";
import { insertCardColumn, listCardColumns } from "../queries/cards";
import { findPersonByEmail, listAccountPeople } from "../queries/people";
import {
	addMember,
	deleteFolder,
	deleteProject,
	deleteTool,
	findFolder,
	findProject,
	insertFolder,
	insertProject,
	insertTool,
	listArchivedProjects,
	listFolders,
	listMembers,
	listMembersForProjects,
	listTemplates,
	listTools,
	listVisibleProjects,
	moveProjectToFolder,
	removeMember,
	renameTool,
	setMemberNotify,
	setProjectArchived,
	setProjectTemplate,
	setToolPosition,
	starProject,
	unstarProject,
	updateFolder,
	updateProject,
	updateProjectLogo,
	type VisibleProjectRow,
} from "../queries/projects";
import { insertTodo, insertTodoList, listProjectTodos, listTodoLists } from "../queries/todos";
import { insertVaultItem, listVaultAll } from "../queries/vault";
import { insertQuestion, listQuestions } from "../queries/checkins";
import { transaction } from "../queries/tx";
import { isAdmin, loadProject, loadProjectAsTeam, type ProjectAccess, scopeArgs } from "./access";
import { ensureMember } from "./accounts";
import { record } from "./activity";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { notify } from "./notify";
import { personMap, pick } from "./people";
import { isDateStr, nowIso } from "./time";

export const TOOL_NAMES: Record<ToolKind, string> = {
	message_board: "Message Board",
	todos: "To-dos",
	docs: "Docs & Files",
	schedule: "Schedule",
	chat: "Chat",
	card_table: "Card Table",
	checkins: "Automatic Check-ins",
	timesheet: "Timesheet",
};

const DEFAULT_TOOLS: ToolKind[] = ["message_board", "todos", "docs", "chat", "schedule", "card_table"];

const asColor = (v: string): Color => ((COLORS as readonly string[]).includes(v) ? (v as Color) : "blue");

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

export function summarize(rows: VisibleProjectRow[]): ProjectSummary[] {
	if (rows.length === 0) return [];
	const people = personMap();
	const members = new Map<number, Person[]>();
	for (const m of listMembersForProjects.all(JSON.stringify(rows.map((r) => r.id)))) {
		const p = people.get(m.userId);
		if (!p) continue;
		const list = members.get(m.projectId) ?? [];
		list.push(p);
		members.set(m.projectId, list);
	}
	return rows.map((r) => {
		const list = members.get(r.id) ?? [];
		return {
			id: r.id,
			name: r.name,
			description: r.description,
			icon: r.icon,
			color: asColor(r.color),
			logoUrl: r.logoUrl,
			folderId: r.folderId,
			access: r.access === "all" ? "all" : "invite",
			isTemplate: r.isTemplate === 1,
			archivedAt: r.archivedAt,
			starred: r.starred > 0,
			lead: pick(people, r.leadId),
			phase: r.phase,
			status: (r.status as ProjectSummary["status"]) || "on_track",
			startOn: r.startOn,
			endOn: r.endOn,
			memberCount: list.length,
			members: list.slice(0, 8),
			updatedAt: r.updatedAt,
		};
	});
}

export function visibleProjects(user: User): ProjectSummary[] {
	return summarize(listVisibleProjects.all(...scopeArgs(user)));
}

export function folders(accountId: number): Folder[] {
	return listFolders.all(accountId).map((f) => ({
		id: f.id,
		name: f.name,
		color: asColor(f.color),
		projectCount: f.projectCount,
	}));
}

export const tools = (projectId: number): ProjectTool[] =>
	listTools.all(projectId).map((t) => ({
		id: t.id,
		kind: t.kind as ToolKind,
		name: t.name,
		position: t.position,
	}));

export function projectRef(access: ProjectAccess): ProjectRef {
	const p = access.project;
	const list = tools(p.id);
	return {
		id: p.id,
		name: p.name,
		icon: p.icon,
		color: asColor(p.color),
		logoUrl: p.logoUrl,
		myRole: access.role,
		tools: access.isClient
			? list.filter((t) => ["message_board", "todos", "docs", "schedule"].includes(t.kind))
			: list,
	};
}

export function projectDetail(user: User, projectId: number): ProjectDetail {
	const access = loadProject(user, projectId);
	const [summary] = summarize([access.project]);
	if (!summary) throw new NotFoundError();
	const people = personMap();
	const memberRows = listMembers.all(projectId);
	return {
		...summary,
		tools: projectRef(access).tools,
		people: memberRows
			.map((m) => {
				const p = people.get(m.userId);
				return p ? { ...p, role: m.role === "client" ? ("client" as const) : ("member" as const) } : null;
			})
			.filter((p): p is NonNullable<typeof p> => p !== null),
		myRole: access.role,
		notify: (access.project.notify ?? 1) === 1,
		inboundEmail: `project-${access.project.inboundToken}@${new URL(config.appUrl).hostname}`,
	};
}

// ---------------------------------------------------------------------------
// Create / update
// ---------------------------------------------------------------------------

export interface ProjectInput {
	name: string;
	description: string;
	icon: string;
	color: string;
	folderId: number | null;
	leadId: number | null;
	phase: string;
	status: string;
	startOn: string | null;
	endOn: string | null;
	access: string;
}

function validate(input: Partial<ProjectInput>): void {
	const errors: Record<string, string> = {};
	if (!input.name || input.name.trim().length < 1) errors.name = "Give the project a name.";
	if (input.name && input.name.length > 120) errors.name = "Keep the name under 120 characters.";
	if (input.startOn && !isDateStr(input.startOn)) errors.startOn = "Pick a valid date.";
	if (input.endOn && !isDateStr(input.endOn)) errors.endOn = "Pick a valid date.";
	if (input.startOn && input.endOn && input.endOn < input.startOn)
		errors.endOn = "The end date must be after the start date.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

const newInboundToken = () => randomBytes(12).toString("hex");

export function addDefaultToolContent(projectId: number, kind: ToolKind): void {
	if (kind === "card_table" && listCardColumns.all(projectId).length === 0) {
		insertCardColumn.get(projectId, "Triage", "gray", "triage", 0);
		insertCardColumn.get(projectId, "In progress", "blue", "column", 1);
		insertCardColumn.get(projectId, "Review", "orange", "column", 2);
		insertCardColumn.get(projectId, "Not now", "gray", "not_now", 98);
		insertCardColumn.get(projectId, "Done", "green", "done", 99);
	}
}

export function createProject(
	user: User,
	input: Partial<ProjectInput> & { templateId?: number | null },
): number {
	if (user.accountRole === "client") throw new ForbiddenError("Clients can't create projects in this workspace.");
	validate(input);
	const id = transaction(() => {
		const row = insertProject.get(
			(input.name ?? "").trim(),
			(input.description ?? "").trim(),
			input.icon ?? "",
			asColor(input.color ?? "blue"),
			input.folderId ?? null,
			newInboundToken(),
			user.id,
			0,
			user.accountId,
		);
		if (!row) throw new Error("insert failed");
		const id = row.id;
		addMember.run(id, user.id, "member");
		if (input.templateId) {
			const template = findProject.get(input.templateId);
			if (template?.isTemplate !== 1 || template.accountId !== user.accountId) throw new NotFoundError("Template not found");
			copyTemplate(template.id, id, user.id);
		} else {
			DEFAULT_TOOLS.forEach((kind, i) => {
				insertTool.run(id, kind, TOOL_NAMES[kind], i);
				addDefaultToolContent(id, kind);
			});
		}
		return id;
	});
	record({
		projectId: id,
		actorId: user.id,
		action: "created",
		type: "project",
		id,
		title: (input.name ?? "").trim(),
		url: `/projects/${id}`,
	});
	return id;
}

/** Copy tools, to-do lists + to-dos, card columns, docs/folders and check-ins. */
function copyTemplate(fromId: number, toId: number, userId: number): void {
	for (const t of listTools.all(fromId)) insertTool.run(toId, t.kind, t.name, t.position);
	for (const col of listCardColumns.all(fromId))
		insertCardColumn.get(toId, col.name, col.color, col.kind, col.position);
	const listMap = new Map<number, number>();
	for (const l of listTodoLists.all(fromId, 0)) {
		const r = insertTodoList.get(toId, l.name, l.description, l.position, l.clientVisible, userId);
		if (r) listMap.set(l.id, r.id);
	}
	for (const t of listProjectTodos.all(fromId)) {
		insertTodo.get(toId, t.listId ? (listMap.get(t.listId) ?? null) : null, null, t.title, t.notes, null, t.position, userId);
	}
	const folderMap = new Map<number, number>();
	const items = listVaultAll.all(fromId, 0);
	// Folders first (parents before children by id order), then leaves.
	for (const v of items.filter((i) => i.kind === "folder").sort((a, b) => a.id - b.id)) {
		const r = insertVaultItem.get(
			toId, v.parentId ? (folderMap.get(v.parentId) ?? null) : null, "folder", v.title, "", v.color,
			null, v.description, null, null, v.clientVisible, userId,
		);
		if (r) folderMap.set(v.id, r.id);
	}
	for (const v of items.filter((i) => i.kind === "doc" || i.kind === "link")) {
		insertVaultItem.get(
			toId, v.parentId ? (folderMap.get(v.parentId) ?? null) : null, v.kind, v.title, v.body, v.color,
			v.url, v.description, v.imageUrl, null, v.clientVisible, userId,
		);
	}
	for (const q of listQuestions.all(fromId)) insertQuestion.get(toId, q.question, q.frequency, q.days, q.timeOfDay, userId);
	if (listCardColumns.all(toId).length === 0 && listTools.all(toId).some((t) => t.kind === "card_table"))
		addDefaultToolContent(toId, "card_table");
}

export function updateProjectSettings(user: User, projectId: number, input: ProjectInput): void {
	loadProjectAsTeam(user, projectId);
	validate(input);
	updateProject.run(
		input.name.trim(),
		input.description.trim(),
		input.icon,
		asColor(input.color),
		input.folderId,
		input.leadId,
		input.phase.trim(),
		["on_track", "at_risk", "off_track", "done"].includes(input.status) ? input.status : "on_track",
		input.startOn || null,
		input.endOn || null,
		input.access === "all" ? "all" : "invite",
		nowIso(),
		projectId,
	);
}

export function setProjectLogo(user: User, projectId: number, url: string | null): void {
	loadProjectAsTeam(user, projectId);
	updateProjectLogo.run(url, projectId);
}

export function archiveProject(user: User, projectId: number, archived: boolean): void {
	loadProjectAsTeam(user, projectId);
	setProjectArchived.run(archived ? nowIso() : null, projectId);
}

export function destroyProject(user: User, projectId: number): void {
	const access = loadProjectAsTeam(user, projectId);
	if (!isAdmin(user) && access.project.createdBy !== user.id)
		throw new ForbiddenError("Only an admin or the project's creator can delete it.");
	deleteProject.run(projectId);
}

export function toggleStar(user: User, projectId: number, starred: boolean): void {
	loadProject(user, projectId);
	if (starred) starProject.run(user.id, projectId);
	else unstarProject.run(user.id, projectId);
}

export function setNotify(user: User, projectId: number, on: boolean): void {
	const access = loadProject(user, projectId);
	if (!access.project.myRole) addMember.run(projectId, user.id, "member");
	setMemberNotify.run(on ? 1 : 0, projectId, user.id);
}

export function moveToFolder(user: User, projectId: number, folderId: number | null): void {
	loadProjectAsTeam(user, projectId);
	if (folderId && findFolder.get(folderId)?.accountId !== user.accountId) throw new NotFoundError("Folder not found");
	moveProjectToFolder.run(folderId, projectId);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function templates(user: User): ProjectSummary[] {
	return summarize(listTemplates.all(...scopeArgs(user)));
}

export function archivedProjects(user: User): ProjectSummary[] {
	return summarize(listArchivedProjects.all(...scopeArgs(user)));
}

/** Save a copy of a project as a reusable template. */
export function saveAsTemplate(user: User, projectId: number): number {
	const access = loadProjectAsTeam(user, projectId);
	const p = access.project;
	return transaction(() => {
		const row = insertProject.get(
			`${p.name} (template)`, p.description, p.icon, p.color, null, newInboundToken(), user.id, 1, p.accountId,
		);
		if (!row) throw new Error("insert failed");
		addMember.run(row.id, user.id, "member");
		copyTemplate(p.id, row.id, user.id);
		return row.id;
	});
}

export function createTemplate(user: User, name: string, description: string): number {
	if (!name.trim()) throw new InputError({ name: "Give the template a name." });
	const row = insertProject.get(name.trim(), description.trim(), "", "blue", null, newInboundToken(), user.id, 1, user.accountId);
	if (!row) throw new Error("insert failed");
	addMember.run(row.id, user.id, "member");
	DEFAULT_TOOLS.forEach((kind, i) => {
		insertTool.run(row.id, kind, TOOL_NAMES[kind], i);
		addDefaultToolContent(row.id, kind);
	});
	setProjectTemplate.run(1, row.id);
	return row.id;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export function addTool(user: User, projectId: number, kind: string): void {
	loadProjectAsTeam(user, projectId);
	if (!(TOOL_KINDS as readonly string[]).includes(kind)) throw new InputError({ kind: "Unknown tool." });
	const k = kind as ToolKind;
	const position = listTools.all(projectId).length;
	insertTool.run(projectId, k, TOOL_NAMES[k], position);
	addDefaultToolContent(projectId, k);
}

export function removeTool(user: User, projectId: number, toolId: number): void {
	loadProjectAsTeam(user, projectId);
	deleteTool.run(toolId, projectId);
}

export function renameProjectTool(user: User, projectId: number, toolId: number, name: string): void {
	loadProjectAsTeam(user, projectId);
	if (!name.trim()) throw new InputError({ name: "Give the tool a name." });
	renameTool.run(name.trim().slice(0, 60), toolId, projectId);
}

export function reorderTools(user: User, projectId: number, ids: number[]): void {
	loadProjectAsTeam(user, projectId);
	transaction(() => {
		ids.forEach((id, i) => {
			setToolPosition.run(i, id, projectId);
		});
	});
}

// ---------------------------------------------------------------------------
// People & invitations
// ---------------------------------------------------------------------------

export interface InviteInput {
	userIds: number[];
	emails: string[];
	role: "member" | "client";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Add existing people, and create + email new people, straight from a project. */
export async function invite(user: User, projectId: number, input: InviteInput): Promise<number> {
	const access = loadProjectAsTeam(user, projectId);
	const bad = input.emails.filter((e) => !EMAIL.test(e));
	if (bad.length) throw new InputError({ emails: `Not a valid email: ${bad.join(", ")}` });
	// Pick-by-id only works for people already in this workspace; anyone else is invited by email.
	const inWorkspace = new Set(listAccountPeople.all(access.project.accountId).map((p) => p.id));
	const added: number[] = input.userIds.filter((id) => inWorkspace.has(id));
	for (const raw of input.emails) {
		const email = raw.trim().toLowerCase();
		const existing = findPersonByEmail.get(email);
		if (existing) {
			added.push(existing.id);
			continue;
		}
		const name = email.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? email;
		const hash = await hashPassword(randomBytes(24).toString("hex"));
		const row = createUser.get(name, email, hash);
		if (!row) continue;
		added.push(row.id);
		const token = createPasswordReset(email);
		const link = `${config.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
		await sendMail({
			to: email,
			subject: `${user.name} invited you to ${access.project.name}`,
			text: `${user.name} invited you to join "${access.project.name}" on GingerMint.\n\nSet your password to get started: ${link}`,
			html: `<p>${user.name} invited you to join <strong>${access.project.name}</strong> on GingerMint.</p><p><a href="${link}">Set your password and jump in</a></p>`,
		}).catch(() => {});
	}
	const unique = [...new Set(added)];
	const accountId = access.project.accountId;
	for (const id of unique) {
		// Joining a project means joining its workspace (clients stay clients there).
		ensureMember(accountId, id, input.role === "client" ? "client" : "member");
		addMember.run(projectId, id, input.role);
	}
	notify(unique, {
		projectId,
		actorId: user.id,
		kind: "invite",
		title: `${user.name} added you to ${access.project.name}`,
		url: `/projects/${projectId}`,
		clientVisible: true,
	});
	return unique.length;
}

export function removeFromProject(user: User, projectId: number, personId: number): void {
	loadProjectAsTeam(user, projectId);
	removeMember.run(projectId, personId);
}

// ---------------------------------------------------------------------------
// Folders (Home)
// ---------------------------------------------------------------------------

export function createFolder(user: User, name: string, color: string): number {
	if (!name.trim()) throw new InputError({ name: "Give the folder a name." });
	if (user.accountRole === "client") throw new ForbiddenError();
	const row = insertFolder.get(name.trim().slice(0, 80), asColor(color), user.id, user.accountId);
	if (!row) throw new Error("insert failed");
	return row.id;
}

export function editFolder(user: User, id: number, name: string, color: string): void {
	if (findFolder.get(id)?.accountId !== user.accountId || user.accountRole === "client") throw new NotFoundError("Folder not found");
	if (!name.trim()) throw new InputError({ name: "Give the folder a name." });
	updateFolder.run(name.trim().slice(0, 80), asColor(color), id);
}

export function removeFolder(user: User, id: number): void {
	if (findFolder.get(id)?.accountId !== user.accountId || user.accountRole === "client") throw new NotFoundError("Folder not found");
	deleteFolder.run(id);
}
