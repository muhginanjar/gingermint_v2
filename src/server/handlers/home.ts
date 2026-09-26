/** Home screen: greeting, project cards grouped by folder, recent activity, folders. */
import { activeInLast24h } from "../services/people";
import { timeline } from "../services/activity";
import { isAdmin } from "../services/access";
import * as projects from "../services/projects";
import { back, body, type Ctx, id, me, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	return render(c, "home/Index", {
		projects: projects.visibleProjects(user),
		folders: projects.folders(user.accountId),
		recent: timeline(user, { limit: 8 }),
		active: activeInLast24h(user.accountId),
		isAdmin: isAdmin(user),
	});
}

export async function createFolder(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.createFolder(user, str(b.name, 80), str(b.color, 20));
	return back(c, "/home", { success: "Folder added." });
}

export async function updateFolder(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	projects.editFolder(user, id(c), str(b.name, 80), str(b.color, 20));
	return back(c, "/home");
}

export function deleteFolder(c: Ctx) {
	const user = me(c);
	projects.removeFolder(user, id(c));
	return back(c, "/home", { success: "Folder removed. Its projects are still here." });
}
