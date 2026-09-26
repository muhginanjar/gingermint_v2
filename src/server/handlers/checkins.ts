/** Automatic Check-ins pages + actions. */
import * as checkins from "../services/checkins";
import { assignablePeople } from "../services/access";
import { commentsFor, isSubscribed } from "../services/comments";
import { projectRef } from "../services/projects";
import { back, body, bool, type Ctx, id, ids, me, redirect, render, str } from "./http";

const questionInput = (b: Record<string, unknown>): checkins.QuestionInput => ({
	question: str(b.question, 500),
	frequency: str(b.frequency, 20),
	days: Array.isArray(b.days) ? b.days.map(Number).filter((n) => Number.isInteger(n)) : ids(b.days),
	timeOfDay: str(b.timeOfDay, 5),
	paused: bool(b.paused),
});

export function index(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const { access, questions } = checkins.list(user, projectId);
	return render(
		c,
		"checkins/Index",
		{ project: projectRef(access), questions },
		{ title: "Automatic Check-ins", kind: "checkins", context: access.project.name },
	);
}

export function newPage(c: Ctx) {
	const user = me(c);
	const { access } = checkins.list(user, id(c, "projectId"));
	return render(c, "checkins/Form", { project: projectRef(access), question: null });
}

export function editPage(c: Ctx) {
	const user = me(c);
	const { access, question } = checkins.showQuestion(user, id(c, "projectId"), id(c));
	return render(c, "checkins/Form", { project: projectRef(access), question });
}

export async function create(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const qid = checkins.createQuestion(user, projectId, questionInput(await body(c)));
	return redirect(c, `/projects/${projectId}/checkins/${qid}`, { success: "Check-in scheduled." });
}

export async function update(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	checkins.updateQuestionItem(user, projectId, id(c), questionInput(await body(c)));
	return redirect(c, `/projects/${projectId}/checkins/${id(c)}`, { success: "Saved." });
}

export function destroy(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	checkins.removeQuestion(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/checkins`, { success: "Check-in removed." });
}

export function show(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const data = checkins.showQuestion(user, projectId, id(c));
	return render(
		c,
		"checkins/Show",
		{ project: projectRef(data.access), question: data.question, answers: data.answers, myAnswerId: data.myAnswerId, askedOn: data.askedOn, people: assignablePeople(projectId) },
		{ title: data.question.question, kind: "checkin_question", context: data.access.project.name },
	);
}

export async function answer(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	checkins.answer(user, id(c, "projectId"), id(c), str(b.body));
	return back(c);
}

export function showAnswer(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	const data = checkins.showAnswer(user, projectId, id(c));
	return render(
		c,
		"checkins/Answer",
		{
			project: projectRef(data.access),
			question: data.question,
			answer: data.answer,
			canEdit: data.canEdit,
			comments: commentsFor(user, "checkin_answer", data.answer.id),
			subscribed: isSubscribed(user.id, "checkin_answer", data.answer.id),
			people: assignablePeople(projectId),
		},
		{ title: `${data.answer.author?.name ?? "Answer"}: ${data.question.question}`, kind: "checkin_answer", context: data.access.project.name },
	);
}

export async function updateAnswer(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	checkins.editAnswer(user, id(c, "projectId"), id(c), str(b.body));
	return back(c);
}

export function destroyAnswer(c: Ctx) {
	const user = me(c);
	const projectId = id(c, "projectId");
	checkins.removeAnswer(user, projectId, id(c));
	return redirect(c, `/projects/${projectId}/checkins`, { success: "Answer deleted." });
}
