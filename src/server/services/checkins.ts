/**
 * Automatic Check-ins: recurring questions asked on a schedule. A small
 * in-process scheduler (startCheckinScheduler) runs every minute and sends a
 * "New for you" prompt to every project member when a question is due.
 */
import type { CheckinAnswer, CheckinQuestion } from "../../shared/models";
import type { User } from "../../shared/types";
import { deleteActivitiesFor } from "../queries/activities";
import {
	type AnswerRow,
	deleteAnswer,
	deleteQuestion,
	findAnswer,
	findAnswerBy,
	findQuestion,
	insertAnswer,
	insertQuestion,
	listActiveQuestions,
	listAnswers,
	listQuestions,
	type QuestionRow,
	setQuestionAsked,
	updateAnswer,
	updateQuestion,
} from "../queries/checkins";
import { deleteCommentsFor, subscribe } from "../queries/comments";
import { listMembers } from "../queries/projects";
import { assertTool, isAdmin, loadProjectAsTeam } from "./access";
import { record } from "./activity";
import { reactionsFor } from "./comments";
import { ForbiddenError, InputError, NotFoundError } from "./errors";
import { notify, notifyMentions } from "./notify";
import { personMap, pick } from "./people";
import { nowIso, toDateStr, today } from "./time";

const FREQS = ["daily", "weekly", "biweekly", "monthly"] as const;

function toQuestion(r: QuestionRow, people = personMap()): CheckinQuestion {
	return {
		id: r.id,
		projectId: r.projectId,
		question: r.question,
		frequency: (FREQS as readonly string[]).includes(r.frequency) ? (r.frequency as CheckinQuestion["frequency"]) : "weekly",
		days: r.days.split(",").filter(Boolean).map(Number),
		timeOfDay: r.timeOfDay,
		paused: r.paused === 1,
		answerCount: r.answerCount,
		lastAskedOn: r.lastAskedOn,
		createdBy: pick(people, r.createdBy),
	};
}

function toAnswers(rows: AnswerRow[], viewerId: number): CheckinAnswer[] {
	const people = personMap();
	const reactions = reactionsFor("checkin_answer", rows.map((r) => r.id), viewerId);
	return rows.map((r) => ({
		id: r.id,
		questionId: r.questionId,
		body: r.body,
		askedOn: r.askedOn,
		author: pick(people, r.authorId),
		commentCount: r.commentCount,
		createdAt: r.createdAt,
		reactions: reactions.get(r.id) ?? [],
	}));
}

function team(user: User, projectId: number) {
	const access = loadProjectAsTeam(user, projectId);
	assertTool(access, "checkins");
	return access;
}

export function list(user: User, projectId: number) {
	const access = team(user, projectId);
	const people = personMap();
	return { access, questions: listQuestions.all(projectId).map((q) => toQuestion(q, people)) };
}

function ownQuestion(projectId: number, id: number): QuestionRow {
	const q = findQuestion.get(id);
	if (!q || q.projectId !== projectId) throw new NotFoundError();
	return q;
}

export function showQuestion(user: User, projectId: number, id: number) {
	const access = team(user, projectId);
	const q = ownQuestion(projectId, id);
	const answers = toAnswers(listAnswers.all(id), user.id);
	const mine = findAnswerBy.get(id, user.id, q.lastAskedOn ?? today());
	return { access, question: toQuestion(q), answers, myAnswerId: mine?.id ?? null, askedOn: q.lastAskedOn ?? today() };
}

export function showAnswer(user: User, projectId: number, id: number) {
	const access = team(user, projectId);
	const a = findAnswer.get(id);
	if (!a || a.projectId !== projectId) throw new NotFoundError();
	const q = ownQuestion(projectId, a.questionId);
	const [answer] = toAnswers([a], user.id);
	if (!answer) throw new NotFoundError();
	return { access, question: toQuestion(q), answer, canEdit: a.authorId === user.id || isAdmin(user) };
}

export interface QuestionInput {
	question: string;
	frequency: string;
	days: number[];
	timeOfDay: string;
	paused: boolean;
}

function validate(input: QuestionInput): void {
	const errors: Record<string, string> = {};
	if (!input.question.trim()) errors.question = "What do you want to ask?";
	if (!(FREQS as readonly string[]).includes(input.frequency)) errors.frequency = "Pick how often to ask.";
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.timeOfDay)) errors.timeOfDay = "Pick a time.";
	if (input.frequency !== "daily" && input.frequency !== "monthly" && input.days.length === 0)
		errors.days = "Pick at least one day.";
	if (Object.keys(errors).length) throw new InputError(errors);
}

const daysCsv = (days: number[]) =>
	[...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort().join(",");

export function createQuestion(user: User, projectId: number, input: QuestionInput): number {
	team(user, projectId);
	validate(input);
	const row = insertQuestion.get(projectId, input.question.trim(), input.frequency, daysCsv(input.days), input.timeOfDay, user.id);
	if (!row) throw new Error("insert failed");
	record({
		projectId, actorId: user.id, action: "started asking", type: "checkin_question", id: row.id,
		title: input.question.trim(), url: `/projects/${projectId}/checkins/${row.id}`,
	});
	return row.id;
}

export function updateQuestionItem(user: User, projectId: number, id: number, input: QuestionInput): void {
	team(user, projectId);
	ownQuestion(projectId, id);
	validate(input);
	updateQuestion.run(input.question.trim(), input.frequency, daysCsv(input.days), input.timeOfDay, input.paused ? 1 : 0, id);
}

export function removeQuestion(user: User, projectId: number, id: number): void {
	team(user, projectId);
	ownQuestion(projectId, id);
	deleteQuestion.run(id);
	deleteActivitiesFor.run("checkin_question", id);
}

export function answer(user: User, projectId: number, questionId: number, body: string): number {
	team(user, projectId);
	const q = ownQuestion(projectId, questionId);
	if (!body.trim()) throw new InputError({ body: "Write your answer." });
	const askedOn = q.lastAskedOn ?? today();
	const existing = findAnswerBy.get(questionId, user.id, askedOn);
	if (existing) {
		updateAnswer.run(body, nowIso(), existing.id);
		return existing.id;
	}
	const row = insertAnswer.get(questionId, projectId, user.id, body, askedOn);
	if (!row) throw new Error("insert failed");
	const url = `/projects/${projectId}/checkins/answers/${row.id}`;
	subscribe.run("checkin_answer", row.id, user.id);
	record({
		projectId, actorId: user.id, action: "answered", type: "checkin_answer", id: row.id, title: q.question,
		excerpt: body, url,
	});
	notifyMentions(body, { projectId, actorId: user.id, kind: "checkin", title: q.question, url });
	return row.id;
}

export function editAnswer(user: User, projectId: number, id: number, body: string): void {
	team(user, projectId);
	const a = findAnswer.get(id);
	if (!a || a.projectId !== projectId) throw new NotFoundError();
	if (a.authorId !== user.id && !isAdmin(user)) throw new ForbiddenError();
	if (!body.trim()) throw new InputError({ body: "Write your answer." });
	updateAnswer.run(body, nowIso(), id);
}

export function removeAnswer(user: User, projectId: number, id: number): void {
	team(user, projectId);
	const a = findAnswer.get(id);
	if (!a || a.projectId !== projectId) throw new NotFoundError();
	if (a.authorId !== user.id && !isAdmin(user)) throw new ForbiddenError();
	deleteAnswer.run(id);
	deleteCommentsFor.run("checkin_answer", id);
	deleteActivitiesFor.run("checkin_answer", id);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/** Is question `q` due at local time `now` (and not yet asked today)? */
export function isDue(q: Pick<QuestionRow, "frequency" | "days" | "timeOfDay" | "lastAskedOn" | "paused">, now: Date): boolean {
	if (q.paused) return false;
	const date = toDateStr(now);
	if (q.lastAskedOn === date) return false;
	const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
	if (hhmm < q.timeOfDay) return false;
	const days = q.days.split(",").filter(Boolean).map(Number);
	switch (q.frequency) {
		case "daily":
			return now.getDay() >= 1 && now.getDay() <= 5;
		case "weekly":
			return days.includes(now.getDay());
		case "biweekly": {
			if (!days.includes(now.getDay())) return false;
			if (!q.lastAskedOn) return true;
			const since = (now.getTime() - new Date(`${q.lastAskedOn}T00:00:00`).getTime()) / 86_400_000;
			return since >= 13;
		}
		case "monthly": {
			// First matching weekday of the month (or the first day it runs, if no weekday picked).
			if ((q.lastAskedOn ?? "").slice(0, 7) === date.slice(0, 7)) return false;
			if (days.length === 0) return true;
			return now.getDate() <= 7 && days.includes(now.getDay());
		}
		default:
			return false;
	}
}

export function askDueQuestions(now = new Date()): number {
	let asked = 0;
	for (const q of listActiveQuestions.all()) {
		if (!isDue(q, now)) continue;
		const date = toDateStr(now);
		setQuestionAsked.run(date, q.id);
		const members = listMembers.all(q.projectId).filter((m) => m.role !== "client").map((m) => m.userId);
		notify(members, {
			projectId: q.projectId,
			actorId: null,
			kind: "checkin",
			title: q.question,
			excerpt: "Automatic check-in — share your answer.",
			url: `/projects/${q.projectId}/checkins/${q.id}`,
		});
		asked++;
	}
	return asked;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startCheckinScheduler(): void {
	if (timer) return;
	timer = setInterval(() => {
		try {
			askDueQuestions();
		} catch (err) {
			console.error("[checkins] scheduler failed", err);
		}
	}, 60_000);
	timer.unref?.();
}
