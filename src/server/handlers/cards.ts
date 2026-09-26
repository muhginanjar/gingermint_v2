/** Card Table pages + actions. */
import * as cards from "../services/cards";
import { assignablePeople } from "../services/access";
import { commentsFor, isSubscribed } from "../services/comments";
import { isBookmarked } from "../services/inbox";
import { projectRef } from "../services/projects";
import { back, body, bool, type Ctx, id, ids, me, num, optStr, redirect, render, str } from "./http";

const cardInput = (b: Record<string, unknown>): cards.CardInput => ({
	title: str(b.title, 300),
	body: str(b.body),
	dueOn: optStr(b.dueOn),
	assigneeIds: ids(b.assigneeIds),
});

const stepInput = (b: Record<string, unknown>) => ({
	title: str(b.title, 300),
	assigneeId: num(b.assigneeId),
	dueOn: optStr(b.dueOn),
});

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, columns } = cards.table(user, projectId);
	return render(
		c,
		"cards/Index",
		{ project: projectRef(access), columns, people: assignablePeople(projectId) },
		{ title: "Card Table", kind: "card_table", context: access.project.name },
	);
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, card } = cards.showCard(user, projectId, id(c));
	const { columns } = cards.table(user, projectId);
	return render(
		c,
		"cards/Show",
		{
			project: projectRef(access),
			card,
			columns: columns.map((col) => ({ id: col.id, name: col.name, color: col.color, kind: col.kind })),
			people: assignablePeople(projectId),
			comments: commentsFor(user, "card", card.id),
			subscribed: isSubscribed(user.id, "card", card.id),
			bookmarked: isBookmarked(user, `/projects/${projectId}/cards/${card.id}`),
		},
		{ title: card.title, kind: "card", context: access.project.name },
	);
}

export async function create(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	cards.createCard(user, id(c, "projectId"), num(b.columnId) ?? 0, cardInput(b));
	return back(c);
}

export async function update(c: Ctx) {
	const user = me(c);
	cards.updateCardItem(user, id(c, "projectId"), id(c), cardInput(await body(c)));
	return back(c);
}

export async function move(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	cards.moveCardItem(user, id(c, "projectId"), id(c), num(b.columnId) ?? 0, num(b.beforeId), bool(b.onHold));
	return back(c);
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	cards.removeCard(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/cards`, { success: "Card deleted." });
}

export async function addColumn(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	cards.addColumn(user, id(c, "projectId"), str(b.name, 60), str(b.color, 20));
	return back(c);
}

export async function updateColumn(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	cards.editColumn(user, id(c, "projectId"), id(c), str(b.name, 60), str(b.color, 20));
	return back(c);
}

export function destroyColumn(c: Ctx) {
	const user = me(c);
	cards.removeColumn(user, id(c, "projectId"), id(c));
	return back(c);
}

export async function reorderColumns(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	cards.reorderColumns(user, id(c, "projectId"), ids(b.ids));
	return back(c);
}

export async function addStep(c: Ctx) {
	const user = me(c);
	cards.addStep(user, id(c, "projectId"), id(c), stepInput(await body(c)));
	return back(c);
}

export async function updateStep(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const projectId = id(c, "projectId");
	if ("done" in b) cards.toggleStep(user, projectId, id(c), bool(b.done));
	else cards.editStep(user, projectId, id(c), stepInput(b));
	return back(c);
}

export function destroyStep(c: Ctx) {
	const user = me(c);
	cards.removeStep(user, id(c, "projectId"), id(c));
	return back(c);
}
