/**
 * People (users) queries for the workspace. Auth-specific statements
 * (sessions, password resets) stay in db.ts with the boilerplate core.
 */

import { db } from "../db";

export interface PersonRow {
	id: number;
	name: string;
	email: string;
	title: string;
	avatarUrl: string | null;
	role: string;
	lastSeenAt: string | null;
	createdAt: string;
}

const COLS = `id, name, email, title, avatar_url AS avatarUrl, role, last_seen_at AS lastSeenAt, created_at AS createdAt`;

export const listPeople = db.query<PersonRow, []>(
	`SELECT ${COLS} FROM users ORDER BY name COLLATE NOCASE`,
);
export const findPerson = db.query<PersonRow, [number]>(
	`SELECT ${COLS} FROM users WHERE id = ?`,
);
export const findPersonByEmail = db.query<PersonRow, [string]>(
	`SELECT ${COLS} FROM users WHERE email = ?`,
);
// Members of one workspace (role = their role in that workspace).
const MEMBER_COLS = `u.id, u.name, u.email, u.title, u.avatar_url AS avatarUrl, m.role, u.last_seen_at AS lastSeenAt, u.created_at AS createdAt`;
export const listAccountPeople = db.query<PersonRow, [number]>(
	`SELECT ${MEMBER_COLS} FROM users u JOIN account_members m ON m.user_id = u.id AND m.account_id = ?
   ORDER BY u.name COLLATE NOCASE`,
);
export const searchAccountPeople = db.query<PersonRow, [number, string, string, number]>(
	`SELECT ${MEMBER_COLS} FROM users u JOIN account_members m ON m.user_id = u.id AND m.account_id = ?1
   WHERE (u.name LIKE ?2 ESCAPE '\\' OR u.email LIKE ?3 ESCAPE '\\') ORDER BY u.name COLLATE NOCASE LIMIT ?4`,
);
export const accountActiveSince = db.query<PersonRow, [number, string]>(
	`SELECT ${MEMBER_COLS} FROM users u JOIN account_members m ON m.user_id = u.id AND m.account_id = ?1
   WHERE u.last_seen_at >= ?2 ORDER BY u.last_seen_at DESC`,
);

export const touchLastSeen = db.query<null, [string, number]>(
	`UPDATE users SET last_seen_at = ? WHERE id = ?`,
);
export const updatePersonTitle = db.query<null, [string, number]>(
	`UPDATE users SET title = ? WHERE id = ?`,
);
export const setCalendarToken = db.query<null, [string, number]>(
	`UPDATE users SET calendar_token = ? WHERE id = ?`,
);
export const findCalendarToken = db.query<{ calendarToken: string | null }, [number]>(
	`SELECT calendar_token AS calendarToken FROM users WHERE id = ?`,
);
export const findPersonByCalendarToken = db.query<PersonRow, [string]>(
	`SELECT ${COLS} FROM users WHERE calendar_token = ?`,
);

