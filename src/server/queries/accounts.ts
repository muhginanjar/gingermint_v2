/** Workspaces (accounts), their members, and the session's current workspace. */
import { db } from "../db";

export interface AccountRow {
	id: number;
	name: string;
	logoUrl: string | null;
	createdAt: string;
}

export interface MembershipRow extends AccountRow {
	role: string;
}

const COLS = `a.id, a.name, a.logo_url AS logoUrl, a.created_at AS createdAt`;

export const findAccount = db.query<AccountRow, [number]>(
	`SELECT ${COLS} FROM accounts a WHERE a.id = ?`,
);
export const insertAccount = db.query<{ id: number }, [string, number]>(
	`INSERT INTO accounts (name, created_by) VALUES (?, ?) RETURNING id`,
);
export const updateAccount = db.query<null, [string, string | null, number]>(
	`UPDATE accounts SET name = ?, logo_url = ? WHERE id = ?`,
);

/** Workspaces a person belongs to, oldest membership first. */
export const listMemberships = db.query<MembershipRow, [number]>(
	`SELECT ${COLS}, m.role FROM account_members m JOIN accounts a ON a.id = m.account_id
   WHERE m.user_id = ? ORDER BY m.created_at, a.id`,
);
export const findMembership = db.query<{ role: string }, [number, number]>(
	`SELECT role FROM account_members WHERE account_id = ? AND user_id = ?`,
);
export const addAccountMember = db.query<null, [number, number, string]>(
	`INSERT OR IGNORE INTO account_members (account_id, user_id, role) VALUES (?, ?, ?)`,
);
export const setAccountRole = db.query<null, [string, number, number]>(
	`UPDATE account_members SET role = ? WHERE account_id = ? AND user_id = ?`,
);
export const removeAccountMember = db.query<null, [number, number]>(
	`DELETE FROM account_members WHERE account_id = ? AND user_id = ?`,
);
/** Take someone off every project in a workspace (when they leave it). */
export const removeFromAccountProjects = db.query<null, [number, number]>(
	`DELETE FROM project_members WHERE user_id = ?2
   AND project_id IN (SELECT id FROM projects WHERE account_id = ?1)`,
);
export const countAccountAdmins = db.query<{ n: number }, [number]>(
	`SELECT COUNT(*) AS n FROM account_members WHERE account_id = ? AND role = 'admin'`,
);

// Current workspace on the session (keyed by the hashed session token).
export const getSessionAccount = db.query<{ accountId: number | null }, [string]>(
	`SELECT account_id AS accountId FROM sessions WHERE token_hash = ?`,
);
export const setSessionAccount = db.query<null, [number, string]>(
	`UPDATE sessions SET account_id = ? WHERE token_hash = ?`,
);
