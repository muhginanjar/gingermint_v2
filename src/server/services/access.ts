/**
 * Access control. A person sees a project when they are an account admin,
 * a member (member or client role), or the project is "All-access".
 * Clients (Client Mode) only see client-visible items and the client tools.
 */
import { CLIENT_TOOLS, type Person, type ProjectRole, type ToolKind } from "../../shared/models";
import type { User } from "../../shared/types";
import { findMembership } from "../queries/accounts";
import { listAccountPeople } from "../queries/people";
import {
	findProject,
	findVisibleProject,
	listMembers,
	listMemberships,
	listVisibleProjects,
	type VisibleProjectRow,
} from "../queries/projects";
import { ForbiddenError, NotFoundError, WorkspaceSwitch } from "./errors";
import { toPerson } from "./people";

export const isAdmin = (user: User): boolean => user.role === "admin";

/** [userId, isAdmin, accountId, isWorkspaceClient] for the visibility queries. */
export const scopeArgs = (user: User): [number, number, number, number] => [
	user.id,
	isAdmin(user) ? 1 : 0,
	user.accountId,
	user.accountRole === "client" ? 1 : 0,
];

export interface ProjectAccess {
	project: VisibleProjectRow;
	role: ProjectRole;
	isClient: boolean;
}

export function roleFor(user: User, row: VisibleProjectRow): ProjectRole {
	if (row.myRole === "client") return "client";
	if (isAdmin(user)) return "admin";
	return "member";
}

/** Load a project the user can see, or throw NotFound (never leak existence). */
export function loadProject(user: User, projectId: number): ProjectAccess {
	const row = findVisibleProject.get(...scopeArgs(user), projectId);
	if (!row) {
		// A link into another of the viewer's workspaces: switch over instead of 404.
		const elsewhere = findProject.get(projectId);
		if (elsewhere && elsewhere.accountId !== user.accountId && findMembership.get(elsewhere.accountId, user.id))
			throw new WorkspaceSwitch(elsewhere.accountId);
		throw new NotFoundError("Project not found");
	}
	const role = roleFor(user, row);
	return { project: row, role, isClient: role === "client" };
}

/** Like loadProject, but clients are refused (internal-only actions). */
export function loadProjectAsTeam(user: User, projectId: number): ProjectAccess {
	const access = loadProject(user, projectId);
	if (access.isClient) throw new ForbiddenError();
	return access;
}

export function assertTool(access: ProjectAccess, kind: ToolKind): void {
	if (access.isClient && !CLIENT_TOOLS.includes(kind)) throw new NotFoundError();
}

export interface Scope {
	/** JSON array of project ids with full (team) access. */
	full: string;
	/** JSON array of project ids where the viewer is a client. */
	client: string;
	fullIds: number[];
	clientIds: number[];
}

/** Cross-project scope for aggregate views (Activity, Everything, Calendar…). */
export function scopeFor(user: User): Scope {
	const visible = listVisibleProjects.all(...scopeArgs(user));
	const clientSet = new Set(
		listMemberships
			.all(user.id)
			.filter((m) => m.role === "client")
			.map((m) => m.projectId),
	);
	const fullIds: number[] = [];
	const clientIds: number[] = [];
	for (const p of visible) (clientSet.has(p.id) ? clientIds : fullIds).push(p.id);
	return {
		full: JSON.stringify(fullIds),
		client: JSON.stringify(clientIds),
		fullIds,
		clientIds,
	};
}

/** People who can be assigned/notified on a project: members, or everyone for All-access. */
export function assignableIds(projectId: number): Set<number> {
	const project = findProject.get(projectId);
	if (!project) return new Set();
	const members = new Set(listMembers.all(projectId).map((m) => m.userId));
	if (project.access !== "all") return members;
	// All-access: every non-client in the workspace, plus anyone on the project.
	for (const p of listAccountPeople.all(project.accountId)) if (p.role !== "client") members.add(p.id);
	return members;
}

export function assignablePeople(projectId: number): Person[] {
	const ids = assignableIds(projectId);
	const project = findProject.get(projectId);
	return (project ? listAccountPeople.all(project.accountId) : []).filter((p) => ids.has(p.id)).map(toPerson);
}
