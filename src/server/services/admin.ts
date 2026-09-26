/** Adminland: the current workspace's settings and its people (workspace admins only). */
import { randomBytes } from "node:crypto";
import type { AccountRole, User } from "../../shared/types";
import { createPasswordReset, hashPassword } from "../auth";
import { config } from "../config";
import { createUser } from "../db";
import { sendMail } from "../mailer";
import {
	countAccountAdmins,
	findMembership,
	removeAccountMember,
	removeFromAccountProjects,
	setAccountRole,
	updateAccount,
} from "../queries/accounts";
import { findPersonByEmail, listAccountPeople, updatePersonTitle } from "../queries/people";
import { transaction } from "../queries/tx";
import { isAdmin } from "./access";
import { account, ensureMember } from "./accounts";
import { ForbiddenError, InputError, NotFoundError } from "./errors";

export const accountName = (accountId: number): string => account(accountId).name;
export const accountLogo = (accountId: number): string | null => account(accountId).logoUrl;

function admin(user: User): void {
	if (!isAdmin(user)) throw new ForbiddenError("Only admins can do that.");
}

export function saveAccount(user: User, input: { name: string; logo: string | null }): void {
	admin(user);
	if (!input.name.trim()) throw new InputError({ name: "Name your workspace." });
	updateAccount.run(input.name.trim().slice(0, 80), input.logo?.startsWith("/files/") ? input.logo : null, user.accountId);
}

export function directory(user: User) {
	return listAccountPeople.all(user.accountId).map((p) => ({
		id: p.id,
		name: p.name,
		email: p.email,
		title: p.title,
		avatarUrl: p.avatarUrl,
		role: p.role as AccountRole,
		lastSeenAt: p.lastSeenAt,
		createdAt: p.createdAt,
	}));
}

const ROLES: AccountRole[] = ["admin", "member", "client"];

export function setRole(user: User, personId: number, role: string): void {
	admin(user);
	const m = findMembership.get(user.accountId, personId);
	if (!m) throw new NotFoundError();
	const next = ROLES.includes(role as AccountRole) ? (role as AccountRole) : "member";
	if (m.role === "admin" && next !== "admin" && (countAccountAdmins.get(user.accountId)?.n ?? 0) <= 1)
		throw new InputError({ role: "The workspace needs at least one admin." });
	setAccountRole.run(next, user.accountId, personId);
}

export function setTitle(user: User, personId: number, title: string): void {
	if (user.id !== personId) admin(user);
	updatePersonTitle.run(title.trim().slice(0, 80), personId);
}

/** Remove someone from this workspace (their account and other workspaces stay). */
export function removePerson(user: User, personId: number): void {
	admin(user);
	if (personId === user.id) throw new InputError({ person: "You can't remove yourself." });
	if (!findMembership.get(user.accountId, personId)) throw new NotFoundError();
	transaction(() => {
		removeFromAccountProjects.run(user.accountId, personId);
		removeAccountMember.run(user.accountId, personId);
	});
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invite someone to this workspace. Existing people (from other workspaces) are just added. */
export async function inviteToAccount(user: User, name: string, email: string, role: string): Promise<number> {
	admin(user);
	const e = email.trim().toLowerCase();
	const errors: Record<string, string> = {};
	if (!EMAIL.test(e)) errors.email = "Enter a valid email.";
	const existing = errors.email ? null : findPersonByEmail.get(e);
	if (existing && findMembership.get(user.accountId, existing.id)) errors.email = "They're already in this workspace.";
	if (!existing && !name.trim()) errors.name = "What's their name?";
	if (Object.keys(errors).length) throw new InputError(errors);
	const accountRole: AccountRole = ROLES.includes(role as AccountRole) ? (role as AccountRole) : "member";
	const workspace = accountName(user.accountId);
	if (existing) {
		ensureMember(user.accountId, existing.id, accountRole);
		await sendMail({
			to: e,
			subject: `${user.name} added you to ${workspace}`,
			text: `${user.name} added you to the ${workspace} workspace on GingerMint. Switch to it from the Jump menu: ${config.appUrl}/workspaces`,
			html: `<p>${user.name} added you to the <strong>${workspace}</strong> workspace on GingerMint.</p><p><a href="${config.appUrl}/workspaces">Open your workspaces</a></p>`,
		}).catch(() => {});
		return existing.id;
	}
	const row = createUser.get(name.trim(), e, await hashPassword(randomBytes(24).toString("hex")));
	if (!row) throw new Error("insert failed");
	ensureMember(user.accountId, row.id, accountRole);
	const token = createPasswordReset(e);
	const link = `${config.appUrl}/reset-password?token=${token}&email=${encodeURIComponent(e)}`;
	await sendMail({
		to: e,
		subject: `${user.name} invited you to ${workspace}`,
		text: `${user.name} invited you to ${workspace} on GingerMint. Set your password: ${link}`,
		html: `<p>${user.name} invited you to <strong>${workspace}</strong> on GingerMint.</p><p><a href="${link}">Set your password</a></p>`,
	}).catch(() => {});
	return row.id;
}
