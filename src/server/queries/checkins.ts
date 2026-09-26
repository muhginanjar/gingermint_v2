/** Automatic Check-ins: questions + answers. */
import { db } from "../db";

export interface QuestionRow {
	id: number;
	projectId: number;
	question: string;
	frequency: string;
	days: string;
	timeOfDay: string;
	paused: number;
	lastAskedOn: string | null;
	createdBy: number | null;
	answerCount: number;
}
const Q_COLS = `q.id, q.project_id AS projectId, q.question, q.frequency, q.days, q.time_of_day AS timeOfDay,
  q.paused, q.last_asked_on AS lastAskedOn, q.created_by AS createdBy,
  (SELECT COUNT(*) FROM checkin_answers a WHERE a.question_id = q.id) AS answerCount`;

export const listQuestions = db.query<QuestionRow, [number]>(
	`SELECT ${Q_COLS} FROM checkin_questions q WHERE q.project_id = ? ORDER BY q.created_at`,
);
export const listActiveQuestions = db.query<QuestionRow, []>(
	`SELECT ${Q_COLS} FROM checkin_questions q JOIN projects p ON p.id = q.project_id
   WHERE q.paused = 0 AND p.archived_at IS NULL AND p.is_template = 0`,
);
export const findQuestion = db.query<QuestionRow, [number]>(
	`SELECT ${Q_COLS} FROM checkin_questions q WHERE q.id = ?`,
);
export const insertQuestion = db.query<
	{ id: number },
	[number, string, string, string, string, number]
>(
	`INSERT INTO checkin_questions (project_id, question, frequency, days, time_of_day, created_by)
   VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateQuestion = db.query<null, [string, string, string, string, number, number]>(
	`UPDATE checkin_questions SET question = ?, frequency = ?, days = ?, time_of_day = ?, paused = ? WHERE id = ?`,
);
export const setQuestionAsked = db.query<null, [string, number]>(
	`UPDATE checkin_questions SET last_asked_on = ? WHERE id = ?`,
);
export const deleteQuestion = db.query<null, [number]>(`DELETE FROM checkin_questions WHERE id = ?`);

export interface AnswerRow {
	id: number;
	questionId: number;
	projectId: number;
	authorId: number | null;
	body: string;
	askedOn: string;
	createdAt: string;
	commentCount: number;
}
const A_COLS = `a.id, a.question_id AS questionId, a.project_id AS projectId, a.author_id AS authorId, a.body,
  a.asked_on AS askedOn, a.created_at AS createdAt,
  (SELECT COUNT(*) FROM comments c WHERE c.recordable_type = 'checkin_answer' AND c.recordable_id = a.id) AS commentCount`;

export const listAnswers = db.query<AnswerRow, [number]>(
	`SELECT ${A_COLS} FROM checkin_answers a WHERE a.question_id = ? ORDER BY a.asked_on DESC, a.created_at`,
);
export const findAnswer = db.query<AnswerRow, [number]>(
	`SELECT ${A_COLS} FROM checkin_answers a WHERE a.id = ?`,
);
export const findAnswerBy = db.query<AnswerRow, [number, number, string]>(
	`SELECT ${A_COLS} FROM checkin_answers a WHERE a.question_id = ? AND a.author_id = ? AND a.asked_on = ?`,
);
export const insertAnswer = db.query<{ id: number }, [number, number, number, string, string]>(
	`INSERT INTO checkin_answers (question_id, project_id, author_id, body, asked_on) VALUES (?, ?, ?, ?, ?) RETURNING id`,
);
export const updateAnswer = db.query<null, [string, string, number]>(
	`UPDATE checkin_answers SET body = ?, updated_at = ? WHERE id = ?`,
);
export const deleteAnswer = db.query<null, [number]>(`DELETE FROM checkin_answers WHERE id = ?`);
