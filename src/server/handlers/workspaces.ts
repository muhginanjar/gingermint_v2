/** Workspaces: list the ones you belong to, create a new one, switch between them. */
import * as accounts from "../services/accounts";
import { body, type Ctx, id, me, redirect, render, str } from "./http";

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
