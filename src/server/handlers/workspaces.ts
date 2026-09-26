/** Workspaces: list the ones you belong to, create, switch, rename, leave, delete. */
import * as accounts from "../services/accounts";
import { back, body, type Ctx, id, me, redirect, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	return render(c, "workspaces/Index", { workspaces: accounts.workspaces(user) }, { title: "Your workspaces", kind: "workspaces" });
}

export async function create(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const accountId = accounts.createWorkspace(user, str(b.name, 80));
	accounts.switchTo(user, c.var.sessionToken, accountId);
	return redirect(c, "/home", { success: "Your new workspace is ready. Make a project or invite people." });
}

export function switchTo(c: Ctx) {
	const user = me(c);
	const accountId = id(c);
	accounts.switchTo(user, c.var.sessionToken, accountId);
	return redirect(c, "/home", { success: `Switched to ${accounts.account(accountId).name}.` });
}

export async function rename(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	accounts.renameWorkspace(user, id(c), str(b.name, 80));
	return back(c, "/workspaces", { success: "Workspace renamed." });
}

export function leave(c: Ctx) {
	const user = me(c);
	const accountId = id(c);
	const name = accounts.account(accountId).name;
	accounts.leaveWorkspace(user, accountId);
	return redirect(c, "/workspaces", { success: `You left ${name}.` });
}

export async function destroy(c: Ctx) {
	const user = me(c);
	const accountId = id(c);
	const b = await body(c);
	const name = accounts.account(accountId).name;
	accounts.deleteWorkspace(user, accountId, str(b.confirm, 80));
	return redirect(c, "/workspaces", { success: `${name} was deleted.` });
}
