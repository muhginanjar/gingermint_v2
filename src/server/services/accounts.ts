/**
 * Workspaces (accounts). A person can belong to several; each request acts in
 * one of them — the session's current workspace, falling back to their first.
 * The request's `user.role` is derived from the role in *that* workspace, so
 * every existing admin check (isAdmin, requireRole) is per workspace.
 */
import type { AccountRole, User } from "../../shared/types";
import { hashToken } from "../auth";
import { toPublicUser, type UserRow } from "../db";
import {
	addAccountMember,
	type AccountRow,
	findAccount,
	findMembership,
	getSessionAccount,
	insertAccount,
	listMemberships,
	type MembershipRow,
	setSessionAccount,
} from "../queries/accounts";
import { countUnreadByAccount } from "../queries/notifications";
import { transaction } from "../queries/tx";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { nowIso } from "./time";

/** The workspace everyone lands in when they sign up on their own. */
export const DEFAULT_ACCOUNT_ID = 1;

const asRole = (r: string): AccountRole => (r === "admin" || r === "client" ? r : "member");

export function asAccountUser(row: UserRow, accountId: number, role: string): User {
	const accountRole = asRole(role);
	return { ...toPublicUser(row), accountId, accountRole, role: accountRole === "admin" ? "admin" : "user" };
}

function memberships(row: UserRow): MembershipRow[] {
	let list = listMemberships.all(row.id);
	if (list.length === 0) {
		// Self sign-ups (and users created outside the app) join the default
		// workspace; the account-wide admin flag carries over as its admin.
		addAccountMember.run(DEFAULT_ACCOUNT_ID, row.id, row.role === "admin" ? "admin" : "member");
		list = listMemberships.all(row.id);
	}
	return list;
}

/** Resolve the signed-in user for this request, inside their current workspace. */
export function userForSession(row: UserRow, sessionToken: string | null): User {
	const list = memberships(row);
	const wanted = sessionToken ? getSessionAccount.get(hashToken(sessionToken))?.accountId : null;
	const current = list.find((m) => m.id === wanted) ?? list[0];
	if (!current) throw new ForbiddenError("You don't belong to any workspace.");
	return asAccountUser(row, current.id, current.role);
}

/** Resolve a user inside a specific workspace (API tokens), or null if they left it. */
export function userInAccount(row: UserRow, accountId: number): User | null {
	const m = findMembership.get(accountId, row.id);
	return m ? asAccountUser(row, accountId, m.role) : null;
}

export function switchTo(user: User, sessionToken: string | null, accountId: number): void {
	if (!findMembership.get(accountId, user.id)) throw new NotFoundError("Workspace not found");
	if (sessionToken) setSessionAccount.run(accountId, hashToken(sessionToken));
}

/** Point the session at a workspace without a membership check (caller verified). */
export function rememberWorkspace(sessionToken: string, accountId: number): void {
	setSessionAccount.run(accountId, hashToken(sessionToken));
}

export interface Workspace {
	id: number;
	name: string;
	logoUrl: string | null;
	role: AccountRole;
	unread: number;
	current: boolean;
}

export function workspaces(user: User): Workspace[] {
	const unread = new Map(countUnreadByAccount.all(user.id, nowIso()).map((r) => [r.accountId, r.n]));
	return listMemberships.all(user.id).map((m) => ({
		id: m.id,
		name: m.name,
		logoUrl: m.logoUrl,
		role: asRole(m.role),
		unread: unread.get(m.id) ?? 0,
		current: m.id === user.accountId,
	}));
}

export function account(accountId: number): AccountRow {
	const a = findAccount.get(accountId);
	if (!a) throw new NotFoundError("Workspace not found");
	return a;
}

/** Create a new workspace; the creator becomes its admin. */
export function createWorkspace(user: User, name: string): number {
	const clean = name.trim();
	if (!clean) throw new InputError({ name: "Name the workspace." });
	if (clean.length > 80) throw new InputError({ name: "Keep the name under 80 characters." });
	return transaction(() => {
		const row = insertAccount.get(clean, user.id);
		if (!row) throw new Error("insert failed");
		addAccountMember.run(row.id, user.id, "admin");
		return row.id;
	});
}

/** Make sure someone belongs to a workspace (used by invitations). Never downgrades. */
export function ensureMember(accountId: number, userId: number, role: AccountRole): void {
	const existing = findMembership.get(accountId, userId);
	if (!existing) addAccountMember.run(accountId, userId, role);
}

export const isMember = (accountId: number, userId: number): boolean => !!findMembership.get(accountId, userId);
