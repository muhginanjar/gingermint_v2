/**
 * Integrations: personal API tokens (JSON API / CLI / AI agents), outgoing
 * project webhooks, and inbound email forwarding into a project.
 */
import { createHash, randomBytes } from "node:crypto";
import type { ApiToken, Webhook } from "../../shared/models";
import type { User } from "../../shared/types";
import {
	deleteApiToken,
	deleteWebhook,
	findApiTokenByHash,
	insertApiToken,
	insertForward,
	insertWebhook,
	listApiTokens,
	listWebhooks,
	setWebhookActive,
	touchApiToken,
} from "../queries/integrations";
import { findUserById } from "../db";
import { userInAccount } from "./accounts";
import { findProjectByInbound, listMembers } from "../queries/projects";
import { loadProjectAsTeam } from "./access";
import { record } from "./activity";
import { InputError } from "./errors";
import { notify } from "./notify";
import { nowIso } from "./time";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export const tokens = (user: User): ApiToken[] =>
	listApiTokens.all(user.id, user.accountId).map((t) => ({ id: t.id, name: t.name, lastUsedAt: t.lastUsedAt, createdAt: t.createdAt }));

/** Create a token; the raw value is returned once and never stored. */
export function createToken(user: User, name: string): string {
	if (!name.trim()) throw new InputError({ name: "Name the token (e.g. “Claude agent”)." });
	const raw = `gm_${randomBytes(24).toString("base64url")}`;
	insertApiToken.run(user.id, name.trim().slice(0, 80), hash(raw), user.accountId);
	return raw;
}

export function revokeToken(user: User, id: number): void {
	deleteApiToken.run(id, user.id);
}

/** Resolve a `Bearer gm_…` header to its user (or null). */
export function userFromToken(header: string | undefined): User | null {
	const m = header?.match(/^Bearer\s+(gm_[A-Za-z0-9_-]{20,})$/);
	if (!m?.[1]) return null;
	const token = findApiTokenByHash.get(hash(m[1]));
	if (!token) return null;
	const row = findUserById.get(token.userId);
	if (!row) return null;
	const user = userInAccount(row, token.accountId);
	if (!user) return null; // they left the workspace the token was made in
	touchApiToken.run(nowIso(), token.id);
	return user;
}

// Webhooks ------------------------------------------------------------------------

export function webhooks(user: User, projectId: number): Webhook[] {
	loadProjectAsTeam(user, projectId);
	return listWebhooks.all(projectId).map((w) => ({
		id: w.id,
		url: w.url,
		active: w.active === 1,
		lastStatus: w.lastStatus,
		createdAt: w.createdAt,
	}));
}

export function addWebhook(user: User, projectId: number, url: string): void {
	loadProjectAsTeam(user, projectId);
	let parsed: URL;
	try {
		parsed = new URL(url.trim());
	} catch {
		throw new InputError({ url: "Paste a full https:// URL." });
	}
	if (parsed.protocol !== "https:" && parsed.hostname !== "localhost")
		throw new InputError({ url: "Webhooks must use https://." });
	insertWebhook.run(projectId, parsed.toString());
}

export function toggleWebhook(user: User, projectId: number, id: number, active: boolean): void {
	loadProjectAsTeam(user, projectId);
	setWebhookActive.run(active ? 1 : 0, id, projectId);
}

export function removeWebhook(user: User, projectId: number, id: number): void {
	loadProjectAsTeam(user, projectId);
	deleteWebhook.run(id, projectId);
}

// Inbound email --------------------------------------------------------------------

/**
 * Accept a forwarded email for a project. Called by an inbound-mail provider
 * webhook (Postmark/Mailgun/SendGrid style) at POST /inbound/:token.
 */
export function receiveForward(token: string, from: string, subject: string, body: string): number | null {
	if (!/^[a-f0-9]{24}$/.test(token)) return null;
	const project = findProjectByInbound.get(token);
	if (!project || project.archivedAt) return null;
	const row = insertForward.get(project.id, from.slice(0, 200) || "unknown", subject.slice(0, 300) || "(no subject)", body.slice(0, 200_000));
	if (!row) return null;
	const url = `/everything/forwards#forward-${row.id}`;
	record({
		projectId: project.id, actorId: null, action: "forwarded an email", type: "forward", id: row.id,
		title: subject || "(no subject)", excerpt: body, url,
	});
	notify(
		listMembers.all(project.id).filter((m) => m.role !== "client").map((m) => m.userId),
		{ projectId: project.id, actorId: null, kind: "forward", title: `Forwarded: ${subject || "(no subject)"}`, excerpt: body, url },
	);
	return row.id;
}
