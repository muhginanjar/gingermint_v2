/** Adminland: account, people, archived projects, templates. Admin-only routes. */
import * as admin from "../services/admin";
import { archivedProjects, createTemplate, templates } from "../services/projects";
import { back, body, type Ctx, id, me, redirect, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	return render(
		c,
		"adminland/Index",
		{
			tab: c.req.query("tab") ?? "people",
			account: { name: admin.accountName(user.accountId), logo: admin.accountLogo(user.accountId) },
			people: admin.directory(user),
			archived: archivedProjects(user),
			templates: templates(user),
		},
		{ title: "Adminland", kind: "adminland" },
	);
}

export async function saveAccount(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	admin.saveAccount(user, { name: str(b.name, 80), logo: str(b.logo, 200) || null });
	return back(c, "/adminland", { success: "Account updated." });
}

export async function invite(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	await admin.inviteToAccount(user, str(b.name, 80), str(b.email, 200), str(b.role, 10));
	return back(c, "/adminland", { success: "Invitation sent." });
}

export async function updatePerson(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	if (typeof b.role === "string") admin.setRole(user, id(c), b.role);
	if (typeof b.title === "string") admin.setTitle(user, id(c), b.title);
	return back(c, "/adminland");
}

export function removePerson(c: Ctx) {
	const user = me(c);
	admin.removePerson(user, id(c));
	return back(c, "/adminland", { success: "Person removed from the account." });
}

export async function newTemplate(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const tid = createTemplate(user, str(b.name, 120), str(b.description, 2000));
	return redirect(c, `/projects/${tid}`, { success: "Template created. Add lists, docs and tools to it." });
}
