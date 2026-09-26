/**
 * Handler helpers: current user, Inertia render with shared "chrome" props
 * (account name, unread badges), redirects, JSON body parsing and small
 * input coercers. Handlers stay thin: parse → call service → respond.
 */
import type { Context } from "hono";
import type { User } from "../../shared/types";
import type { ChromeProps } from "../../shared/models";
import { setFlash } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import { account, workspaces } from "../services/accounts";
import { markSeen } from "../services/people";
import { markUrlRead, visit } from "../services/inbox";
import { unreadCount } from "../services/notify";
import { unreadPings } from "../services/pings";
import { ForbiddenError, NotFoundError } from "../services/errors";
import { safeUrl } from "../url";

export type Ctx = Context<AppEnv>;

export function me(c: Ctx): User {
	const user = c.var.user;
	if (!user) throw new ForbiddenError("Please sign in.");
	return user;
}

export function chrome(user: User): ChromeProps {
	const current = account(user.accountId);
	return {
		accountId: current.id,
		accountName: current.name,
		accountLogo: current.logoUrl,
		accountRole: user.accountRole,
		workspaces: workspaces(user),
		unreadCount: unreadCount(user.id, user.accountId),
		pingUnread: unreadPings(user.id, user.accountId),
	};
}

export interface VisitInfo {
	title: string;
	kind: string;
	context?: string;
}

/** Render an authenticated page; records presence + "recently visited". */
export function render(c: Ctx, component: string, props: Record<string, unknown>, v?: VisitInfo) {
	const user = me(c);
	markSeen(user.id);
	const path = safeUrl(c.req.url).pathname;
	markUrlRead(user, path);
	if (v) visit(user, { url: path, title: v.title, kind: v.kind, context: v.context ?? "" });
	return c.var.inertia.render(component, { ...props, chrome: chrome(user) });
}

export function redirect(c: Ctx, path: string, flash?: { success?: string; error?: string }) {
	if (flash && c.var.sessionToken) setFlash(c.var.sessionToken, flash);
	return c.var.inertia.redirect(path);
}

/** Redirect to the (same-origin) Referer, or `fallback`. */
export function back(c: Ctx, fallback = "/home", flash?: { success?: string; error?: string }) {
	const ref = c.req.header("referer");
	let target = fallback;
	if (ref) {
		const u = safeUrl(ref);
		const here = safeUrl(c.req.url);
		if (u.host === here.host) target = u.pathname + u.search;
	}
	return redirect(c, target.replace(/[?&]_spa=1/, ""), flash);
}

/** True when the caller is fetch() (JSON), not an Inertia visit. */
export const wantsJson = (c: Ctx): boolean =>
	c.req.header("x-inertia") !== "true" && (c.req.header("accept") ?? "").includes("application/json");

export async function body(c: Ctx): Promise<Record<string, unknown>> {
	const type = c.req.header("content-type") ?? "";
	try {
		if (type.includes("application/json")) {
			const data = await c.req.json();
			return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
		}
		if (type.includes("form")) {
			const form = await c.req.formData();
			return Object.fromEntries(form.entries());
		}
	} catch {
		/* malformed body → empty */
	}
	return {};
}

export function id(c: Ctx, name = "id"): number {
	const n = Number(c.req.param(name));
	if (!Number.isInteger(n) || n <= 0) throw new NotFoundError();
	return n;
}

export const str = (v: unknown, max = 100_000): string => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
export const optStr = (v: unknown): string | null => {
	const s = str(v).trim();
	return s ? s : null;
};
export const num = (v: unknown): number | null => {
	const n = Number(v);
	return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};
export const bool = (v: unknown): boolean => v === true || v === "true" || v === "1" || v === 1 || v === "on";
export const ids = (v: unknown): number[] =>
	Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
export const strs = (v: unknown): string[] =>
	Array.isArray(v) ? v.map((x) => str(x).trim()).filter(Boolean) : typeof v === "string" ? v.split(/[\s,;]+/).filter(Boolean) : [];
