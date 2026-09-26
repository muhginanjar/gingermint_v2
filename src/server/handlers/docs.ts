/** Docs & Files: folder browser, documents, files, external links. */
import * as vault from "../services/vault";
import { assignablePeople } from "../services/access";
import { commentsFor, isSubscribed } from "../services/comments";
import { isBookmarked } from "../services/inbox";
import { projectRef } from "../services/projects";
import { back, body, bool, type Ctx, id, ids, me, num, optStr, redirect, render, str } from "./http";

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, items } = vault.vault(user, projectId);
	return render(
		c,
		"docs/Index",
		{ project: projectRef(access), items, folder: null, trail: [] },
		{ title: "Docs & Files", kind: "docs", context: access.project.name },
	);
}

export function folder(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, items } = vault.vault(user, projectId);
	const { folder: f, trail } = vault.folderTrail(user, projectId, id(c));
	return render(
		c,
		"docs/Index",
		{ project: projectRef(access), items, folder: f, trail },
		{ title: f?.title ?? "Folder", kind: "folder", context: access.project.name },
	);
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, item, trail } = vault.showItem(user, projectId, id(c));
	if (item.kind === "folder") return redirect(c, `/projects/${projectId}/docs/folders/${item.id}`);
	return render(
		c,
		"docs/Show",
		{
			project: projectRef(access),
			item,
			trail,
			comments: commentsFor(user, item.kind, item.id),
			subscribed: isSubscribed(user.id, item.kind, item.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/docs/${item.id}`),
			people: assignablePeople(projectId),
		},
		{ title: item.title, kind: item.kind, context: access.project.name },
	);
}

export function newDoc(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access } = vault.vault(user, projectId);
	return render(c, "docs/Form", {
		project: projectRef(access),
		item: null,
		parentId: num(c.req.query("parent")),
		people: assignablePeople(projectId),
	});
}

export function editDoc(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, item } = vault.showItem(user, projectId, id(c));
	return render(c, "docs/Form", {
		project: projectRef(access),
		item,
		parentId: item.parentId,
		people: assignablePeople(projectId),
	});
}

export async function create(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const b = await body(c);
	const kind = (["folder", "doc", "link", "file"] as const).find((k) => k === b.kind) ?? "doc";
	// Several uploads at once: { kind: "file", files: [{ attachmentId, title }] }.
	if (kind === "file" && Array.isArray(b.files)) {
		for (const f of b.files as Record<string, unknown>[]) {
			vault.createItem(user, projectId, {
				kind: "file", parentId: num(b.parentId), title: str(f.title, 200), body: "", color: "blue", url: null,
				description: "", imageUrl: null, attachmentId: optStr(f.attachmentId), clientVisible: bool(b.clientVisible),
			});
		}
		return back(c);
	}
	const itemId = vault.createItem(user, projectId, {
		kind,
		parentId: num(b.parentId),
		title: str(b.title, 200),
		body: str(b.body),
		color: str(b.color, 20),
		url: optStr(b.url),
		description: str(b.description, 2000),
		imageUrl: optStr(b.imageUrl),
		attachmentId: optStr(b.attachmentId),
		clientVisible: bool(b.clientVisible),
	});
	if (kind === "doc") return redirect(c, `/projects/${projectId}/docs/${itemId}`, { success: "Document saved." });
	return back(c);
}

export async function update(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const b = await body(c);
	vault.updateItem(user, projectId, id(c), {
		title: str(b.title, 200),
		body: str(b.body),
		color: str(b.color, 20),
		url: optStr(b.url),
		description: str(b.description, 2000),
		imageUrl: optStr(b.imageUrl),
		clientVisible: bool(b.clientVisible),
	});
	if (b.redirect === "show") return redirect(c, `/projects/${projectId}/docs/${id(c)}`, { success: "Saved." });
	return back(c);
}

export async function move(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	vault.moveItems(user, id(c, "projectId"), ids(b.ids), num(b.parentId));
	return back(c);
}

export async function bulkDelete(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	vault.removeItems(user, id(c, "projectId"), ids(b.ids));
	return back(c, undefined, { success: "Deleted." });
}

export async function visibility(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	vault.setClientVisibility(user, id(c, "projectId"), ids(b.ids), bool(b.visible));
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { item } = vault.showItem(user, projectId, id(c));
	vault.removeItems(user, projectId, [item.id]);
	const to = item.parentId ? `/projects/${projectId}/docs/folders/${item.parentId}` : `/projects/${projectId}/docs`;
	return redirect(c, to, { success: "Deleted." });
}
