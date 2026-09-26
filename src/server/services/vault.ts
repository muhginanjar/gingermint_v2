/** Docs & Files: folders (colored), documents, uploaded files, external links. */
import type { Color, VaultItem } from "../../shared/models";
import { COLORS } from "../../shared/models";
import type { User } from "../../shared/types";
import { deleteActivitiesFor } from "../queries/activities";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import { transaction } from "../queries/tx";
import {
	deleteVaultItem,
	findAttachment,
	findVaultItem,
	insertVaultItem,
	listVaultAll,
	moveVaultItem,
	updateVaultItem,
	type VaultItemRow,
} from "../queries/vault";
import { assertTool, loadProject, loadProjectAsTeam, type ProjectAccess } from "./access";
import { record } from "./activity";
import { attachmentMap } from "./attachments";
import { InputError, NotFoundError } from "./errors";
import { notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { nowIso } from "./time";

const asColor = (v: string): Color => ((COLORS as readonly string[]).includes(v) ? (v as Color) : "blue");

export function toItems(rows: VaultItemRow[]): VaultItem[] {
	const people = personMap();
	const files = attachmentMap(rows.map((r) => r.attachmentId));
	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		parentId: r.parentId,
		kind: r.kind as VaultItem["kind"],
		title: r.title,
		body: r.body,
		color: asColor(r.color),
		url: r.url,
		description: r.description,
		imageUrl: r.imageUrl,
		attachment: r.attachmentId ? (files.get(r.attachmentId) ?? null) : null,
		clientVisible: r.clientVisible === 1,
		childCount: r.childCount,
		commentCount: r.commentCount,
		createdBy: pick(people, r.createdBy),
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
	}));
}

function view(user: User, projectId: number): ProjectAccess {
	const access = loadProject(user, projectId);
	assertTool(access, "docs");
	return access;
}

/** All items of the project (the page builds the tree, filters and sorts live). */
export function vault(user: User, projectId: number) {
	const access = view(user, projectId);
	const items = toItems(listVaultAll.all(projectId, access.isClient ? 1 : 0)).map((i) => ({
		...i,
		body: "", // docs bodies aren't needed on the listing
	}));
	return { access, items };
}

function own(access: ProjectAccess, id: number): VaultItemRow {
	const row = findVaultItem.get(id);
	if (!row || row.projectId !== access.project.id) throw new NotFoundError();
	if (access.isClient && row.clientVisible !== 1) throw new NotFoundError();
	return row;
}

function breadcrumbs(access: ProjectAccess, parentId: number | null): { id: number; title: string }[] {
	const trail: { id: number; title: string }[] = [];
	let cur = parentId;
	for (let guard = 0; cur && guard < 50; guard++) {
		const row = findVaultItem.get(cur);
		if (!row || row.projectId !== access.project.id) break;
		trail.unshift({ id: row.id, title: row.title });
		cur = row.parentId;
	}
	return trail;
}

export function showItem(user: User, projectId: number, id: number) {
	const access = view(user, projectId);
	const [item] = toItems([own(access, id)]);
	if (!item) throw new NotFoundError();
	return { access, item, trail: breadcrumbs(access, item.parentId) };
}

export function folderTrail(user: User, projectId: number, folderId: number) {
	const access = view(user, projectId);
	const row = own(access, folderId);
	if (row.kind !== "folder") throw new NotFoundError();
	return { access, folder: toItems([row])[0], trail: breadcrumbs(access, folderId) };
}

function checkParent(access: ProjectAccess, parentId: number | null): void {
	if (!parentId) return;
	const parent = own(access, parentId);
	if (parent.kind !== "folder") throw new InputError({ parentId: "Pick a folder." });
}

const SAFE_LINK = /^https?:\/\//i;

export interface VaultInput {
	kind: "folder" | "doc" | "link" | "file";
	parentId: number | null;
	title: string;
	body: string;
	color: string;
	url: string | null;
	description: string;
	imageUrl: string | null;
	attachmentId: string | null;
	clientVisible: boolean;
}

function validate(input: VaultInput): void {
	const errors: Record<string, string> = {};
	if (!input.title.trim()) errors.title = "Give it a title.";
	if (input.title.length > 200) errors.title = "Keep the title under 200 characters.";
	if (input.kind === "link" && (!input.url || !SAFE_LINK.test(input.url))) errors.url = "Paste a full http(s):// link.";
	if (input.imageUrl && !SAFE_LINK.test(input.imageUrl) && !input.imageUrl.startsWith("/files/"))
		errors.imageUrl = "Use an http(s):// image link.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

const VERB: Record<string, string> = {
	folder: "made a folder",
	doc: "wrote a document",
	link: "added a link",
	file: "uploaded",
};

export function createItem(user: User, projectId: number, input: VaultInput): number {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "docs");
	validate(input);
	checkParent(access, input.parentId);
	if (input.kind === "file") {
		const att = input.attachmentId ? findAttachment.get(input.attachmentId) : null;
		if (!att || att.projectId !== projectId) throw new InputError({ file: "Upload the file first." });
	}
	const row = insertVaultItem.get(
		projectId, input.parentId, input.kind, input.title.trim(), input.body, asColor(input.color),
		input.kind === "link" ? input.url : null, input.description.trim(), input.imageUrl || null,
		input.attachmentId, input.clientVisible ? 1 : 0, user.id,
	);
	if (!row) throw new Error("insert failed");
	const url = input.kind === "folder" ? `/projects/${projectId}/docs/folders/${row.id}` : `/projects/${projectId}/docs/${row.id}`;
	subscribe.run(input.kind, row.id, user.id);
	record({
		projectId, actorId: user.id, action: VERB[input.kind] ?? "added", type: input.kind, id: row.id,
		title: input.title.trim(), url, excerpt: input.kind === "doc" ? input.body : input.description,
		clientVisible: input.clientVisible,
	});
	if (input.kind === "doc")
		notifyMentions(input.body, {
			projectId, actorId: user.id, kind: "doc", title: input.title.trim(), url, clientVisible: input.clientVisible,
		});
	return row.id;
}

export function updateItem(user: User, projectId: number, id: number, input: Omit<VaultInput, "kind" | "parentId" | "attachmentId">): void {
	const access = loadProjectAsTeam(user, projectId);
	const row = own(access, id);
	validate({ ...input, kind: row.kind as VaultInput["kind"], parentId: row.parentId, attachmentId: row.attachmentId });
	updateVaultItem.run(
		input.title.trim(), row.kind === "doc" ? input.body : row.body, asColor(input.color),
		row.kind === "link" ? input.url : row.url, input.description.trim(), input.imageUrl || null,
		input.clientVisible ? 1 : 0, nowIso(), id,
	);
	if (row.kind === "doc") {
		record({
			projectId, actorId: user.id, action: "edited", type: "doc", id, title: input.title.trim(),
			url: `/projects/${projectId}/docs/${id}`, clientVisible: input.clientVisible,
		});
	}
}

/** Move many items into a folder (null = top level). Folders can't go inside themselves. */
export function moveItems(user: User, projectId: number, ids: number[], parentId: number | null): void {
	const access = loadProjectAsTeam(user, projectId);
	checkParent(access, parentId);
	const ancestors = new Set<number>();
	for (let cur = parentId, g = 0; cur && g < 50; g++) {
		ancestors.add(cur);
		cur = findVaultItem.get(cur)?.parentId ?? null;
	}
	transaction(() => {
		for (const id of ids) {
			own(access, id);
			if (ancestors.has(id)) throw new InputError({ parentId: "A folder can't go inside itself." });
			moveVaultItem.run(parentId, nowIso(), id);
		}
	});
}

export function removeItems(user: User, projectId: number, ids: number[]): void {
	const access = loadProjectAsTeam(user, projectId);
	transaction(() => {
		for (const id of ids) {
			const row = own(access, id);
			deleteVaultItem.run(id);
			deleteCommentsFor.run(row.kind, id);
			deleteActivitiesFor.run(row.kind, id);
		}
	});
}

export function setClientVisibility(user: User, projectId: number, ids: number[], visible: boolean): void {
	const access = loadProjectAsTeam(user, projectId);
	transaction(() => {
		for (const id of ids) {
			const r = own(access, id);
			updateVaultItem.run(r.title, r.body, r.color, r.url, r.description, r.imageUrl, visible ? 1 : 0, nowIso(), id);
		}
	});
}
