/** Card Table: Kanban columns (Triage, stages, Not now, Done), cards, steps, on-hold. */
import type { Card, CardColumn, CardColumnKind, CardDetail, CardStep, Color, Person } from "../../shared/models";
import { COLORS } from "../../shared/models";
import type { User } from "../../shared/types";
import { deleteActivitiesFor } from "../queries/activities";
import {
	addCardAssignee,
	type CardRow,
	clearCardAssignees,
	deleteCard,
	deleteCardColumn,
	deleteCardStep,
	findCard,
	findCardColumn,
	findCardStep,
	insertCard,
	insertCardColumn,
	insertCardStep,
	listCardAssignees,
	listCardColumns,
	listCards,
	listCardSteps,
	maxCardPosition,
	maxColumnPosition,
	moveCard,
	setCardColumnPosition,
	setCardStepCompleted,
	updateCard,
	updateCardColumn,
	updateCardStep,
} from "../queries/cards";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import { transaction } from "../queries/tx";
import { assertTool, assignableIds, loadProjectAsTeam, type ProjectAccess } from "./access";
import { record } from "./activity";
import { InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { addDefaultToolContent } from "./projects";
import { personMap, pick } from "./people";
import { isDateStr, nowIso } from "./time";

const asColor = (v: string): Color => ((COLORS as readonly string[]).includes(v) ? (v as Color) : "gray");

function toCards(rows: CardRow[], people = personMap()): Card[] {
	const assignees = new Map<number, Person[]>();
	if (rows.length) {
		for (const a of listCardAssignees.all(JSON.stringify(rows.map((r) => r.id)))) {
			const p = people.get(a.userId);
			if (!p) continue;
			assignees.set(a.cardId, [...(assignees.get(a.cardId) ?? []), p]);
		}
	}
	return rows.map((r) => ({
		id: r.id,
		columnId: r.columnId,
		title: r.title,
		body: r.body,
		dueOn: r.dueOn,
		position: r.position,
		onHold: r.onHold === 1,
		assignees: assignees.get(r.id) ?? [],
		stepsTotal: r.stepsTotal,
		stepsDone: r.stepsDone,
		commentCount: r.commentCount,
		createdBy: pick(people, r.createdBy),
		createdAt: r.createdAt,
	}));
}

function team(user: User, projectId: number): ProjectAccess {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "card_table");
	return access;
}

export function table(user: User, projectId: number) {
	const access = team(user, projectId);
	addDefaultToolContent(projectId, "card_table");
	const cards = toCards(listCards.all(projectId));
	const columns: CardColumn[] = listCardColumns.all(projectId).map((c) => ({
		id: c.id,
		name: c.name,
		color: asColor(c.color),
		kind: c.kind as CardColumnKind,
		position: c.position,
		cards: cards.filter((card) => card.columnId === c.id),
	}));
	return { access, columns };
}

function ownCard(projectId: number, id: number): CardRow {
	const row = findCard.get(id);
	if (!row || row.projectId !== projectId) throw new NotFoundError("Card not found");
	return row;
}

function ownColumn(projectId: number, id: number) {
	const col = findCardColumn.get(id);
	if (!col || col.projectId !== projectId) throw new NotFoundError("Column not found");
	return col;
}

export function showCard(user: User, projectId: number, id: number): { access: ProjectAccess; card: CardDetail } {
	const access = team(user, projectId);
	const row = ownCard(projectId, id);
	const people = personMap();
	const [card] = toCards([row], people);
	const col = ownColumn(projectId, row.columnId);
	if (!card) throw new NotFoundError();
	const steps: CardStep[] = listCardSteps.all(id).map((s) => ({
		id: s.id,
		title: s.title,
		assignee: pick(people, s.assigneeId),
		dueOn: s.dueOn,
		completedAt: s.completedAt,
	}));
	return { access, card: { ...card, steps, column: { id: col.id, name: col.name, color: asColor(col.color) } } };
}

export interface CardInput {
	title: string;
	body: string;
	dueOn: string | null;
	assigneeIds: number[];
}

function validate(input: CardInput): void {
	const errors: Record<string, string> = {};
	if (!input.title.trim()) errors.title = "Give the card a title.";
	if (input.dueOn && !isDateStr(input.dueOn)) errors.dueOn = "Pick a valid date.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

function setAssignees(projectId: number, cardId: number, ids: number[]): number[] {
	const allowed = assignableIds(projectId);
	clearCardAssignees.run(cardId);
	const out = [...new Set(ids)].filter((i) => allowed.has(i));
	for (const i of out) addCardAssignee.run(cardId, i);
	return out;
}

export function createCard(user: User, projectId: number, columnId: number, input: CardInput): number {
	team(user, projectId);
	const col = ownColumn(projectId, columnId);
	validate(input);
	const pos = (maxCardPosition.get(columnId)?.p ?? 0) + 1;
	const row = insertCard.get(projectId, columnId, input.title.trim(), input.body, input.dueOn || null, pos, user.id);
	if (!row) throw new Error("insert failed");
	const assigned = setAssignees(projectId, row.id, input.assigneeIds);
	subscribe.run("card", row.id, user.id);
	const url = `/projects/${projectId}/cards/${row.id}`;
	record({
		projectId, actorId: user.id, action: "added a card", type: "card", id: row.id, title: input.title.trim(),
		url, excerpt: `in ${col.name}`,
	});
	notify(assigned, { projectId, actorId: user.id, kind: "assignment", title: `Assigned to you: ${input.title.trim()}`, url });
	notifyMentions(input.body, { projectId, actorId: user.id, kind: "card", title: input.title.trim(), url });
	return row.id;
}

export function updateCardItem(user: User, projectId: number, id: number, input: CardInput): void {
	team(user, projectId);
	ownCard(projectId, id);
	validate(input);
	const before = new Set(listCardAssignees.all(JSON.stringify([id])).map((a) => a.userId));
	updateCard.run(input.title.trim(), input.body, input.dueOn || null, nowIso(), id);
	const assigned = setAssignees(projectId, id, input.assigneeIds);
	notify(
		assigned.filter((a) => !before.has(a)),
		{ projectId, actorId: user.id, kind: "assignment", title: `Assigned to you: ${input.title.trim()}`, url: `/projects/${projectId}/cards/${id}` },
	);
}

/** Move a card to a column (optionally before another card, optionally on hold). */
export function moveCardItem(
	user: User,
	projectId: number,
	id: number,
	columnId: number,
	beforeId: number | null,
	onHold: boolean,
): void {
	team(user, projectId);
	const card = ownCard(projectId, id);
	const col = ownColumn(projectId, columnId);
	let position: number;
	if (beforeId) {
		const before = ownCard(projectId, beforeId);
		const siblings = listCards.all(projectId).filter((c) => c.columnId === columnId && c.id !== id);
		const idx = siblings.findIndex((s) => s.id === before.id);
		const prev = idx > 0 ? (siblings[idx - 1]?.position ?? before.position - 1) : before.position - 1;
		position = (prev + before.position) / 2;
	} else {
		position = (maxCardPosition.get(columnId)?.p ?? 0) + 1;
	}
	const hold = onHold && col.kind === "column" ? 1 : 0;
	moveCard.run(columnId, position, hold, nowIso(), id);
	if (card.columnId !== columnId) {
		record({
			projectId, actorId: user.id, action: col.kind === "done" ? "completed" : `moved to ${col.name}`,
			type: "card", id, title: card.title, url: `/projects/${projectId}/cards/${id}`,
		});
	}
}

export function removeCard(user: User, projectId: number, id: number): void {
	team(user, projectId);
	ownCard(projectId, id);
	deleteCard.run(id);
	deleteCommentsFor.run("card", id);
	deleteActivitiesFor.run("card", id);
}

// Columns ---------------------------------------------------------------------

export function addColumn(user: User, projectId: number, name: string, color: string): void {
	team(user, projectId);
	if (!name.trim()) throw new InputError({ name: "Name the column." });
	const pos = (maxColumnPosition.get(projectId)?.p ?? 0) + 1;
	insertCardColumn.get(projectId, name.trim().slice(0, 60), asColor(color), "column", Math.min(pos, 97));
}

export function editColumn(user: User, projectId: number, id: number, name: string, color: string): void {
	team(user, projectId);
	ownColumn(projectId, id);
	if (!name.trim()) throw new InputError({ name: "Name the column." });
	updateCardColumn.run(name.trim().slice(0, 60), asColor(color), id);
}

export function removeColumn(user: User, projectId: number, id: number): void {
	team(user, projectId);
	const col = ownColumn(projectId, id);
	if (col.kind !== "column") throw new InputError({ column: "Triage, Not now and Done can't be removed." });
	const triage = listCardColumns.all(projectId).find((c) => c.kind === "triage");
	transaction(() => {
		if (triage) {
			for (const c of listCards.all(projectId).filter((c) => c.columnId === id))
				moveCard.run(triage.id, c.position, 0, nowIso(), c.id);
		}
		deleteCardColumn.run(id);
	});
}

export function reorderColumns(user: User, projectId: number, ids: number[]): void {
	team(user, projectId);
	transaction(() =>
		ids.forEach((id, i) => {
			const col = ownColumn(projectId, id);
			if (col.kind === "column") setCardColumnPosition.run(i + 1, id);
		}),
	);
}

// Steps -------------------------------------------------------------------------

export function addStep(
	user: User,
	projectId: number,
	cardId: number,
	input: { title: string; assigneeId: number | null; dueOn: string | null },
): void {
	team(user, projectId);
	ownCard(projectId, cardId);
	if (!input.title.trim()) throw new InputError({ title: "Describe the step." });
	const allowed = assignableIds(projectId);
	const assignee = input.assigneeId && allowed.has(input.assigneeId) ? input.assigneeId : null;
	insertCardStep.run(cardId, input.title.trim(), assignee, input.dueOn && isDateStr(input.dueOn) ? input.dueOn : null, listCardSteps.all(cardId).length + 1);
	if (assignee)
		notify([assignee], {
			projectId, actorId: user.id, kind: "assignment", title: `Step assigned to you: ${input.title.trim()}`,
			url: `/projects/${projectId}/cards/${cardId}`,
		});
}

function ownStep(projectId: number, stepId: number) {
	const step = findCardStep.get(stepId);
	if (!step) throw new NotFoundError();
	ownCard(projectId, step.cardId);
	return step;
}

export function editStep(
	user: User,
	projectId: number,
	stepId: number,
	input: { title: string; assigneeId: number | null; dueOn: string | null },
): void {
	team(user, projectId);
	ownStep(projectId, stepId);
	if (!input.title.trim()) throw new InputError({ title: "Describe the step." });
	updateCardStep.run(input.title.trim(), input.assigneeId, input.dueOn && isDateStr(input.dueOn) ? input.dueOn : null, stepId);
}

export function toggleStep(user: User, projectId: number, stepId: number, done: boolean): void {
	team(user, projectId);
	ownStep(projectId, stepId);
	setCardStepCompleted.run(done ? nowIso() : null, stepId);
}

export function removeStep(user: User, projectId: number, stepId: number): void {
	team(user, projectId);
	ownStep(projectId, stepId);
	deleteCardStep.run(stepId);
}
