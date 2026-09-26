/** API tokens, outgoing webhooks, forwarded emails. */
import { db } from "../db";

export interface ApiTokenRow {
	id: number;
	userId: number;
	accountId: number;
	name: string;
	lastUsedAt: string | null;
	createdAt: string;
}
export const listApiTokens = db.query<ApiTokenRow, [number, number]>(
	`SELECT id, user_id AS userId, account_id AS accountId, name, last_used_at AS lastUsedAt, created_at AS createdAt FROM api_tokens WHERE user_id = ? AND account_id = ? ORDER BY id DESC`,
);
export const findApiTokenByHash = db.query<ApiTokenRow, [string]>(
	`SELECT id, user_id AS userId, account_id AS accountId, name, last_used_at AS lastUsedAt, created_at AS createdAt FROM api_tokens WHERE token_hash = ?`,
);
export const insertApiToken = db.query<null, [number, string, string, number]>(
	`INSERT INTO api_tokens (user_id, name, token_hash, account_id) VALUES (?, ?, ?, ?)`,
);
export const touchApiToken = db.query<null, [string, number]>(
	`UPDATE api_tokens SET last_used_at = ? WHERE id = ?`,
);
export const deleteApiToken = db.query<null, [number, number]>(
	`DELETE FROM api_tokens WHERE id = ? AND user_id = ?`,
);

export interface WebhookRow {
	id: number;
	projectId: number;
	url: string;
	active: number;
	lastStatus: number | null;
	createdAt: string;
}
const WH = `id, project_id AS projectId, url, active, last_status AS lastStatus, created_at AS createdAt`;
export const listWebhooks = db.query<WebhookRow, [number]>(
	`SELECT ${WH} FROM webhooks WHERE project_id = ? ORDER BY id`,
);
export const listActiveWebhooks = db.query<WebhookRow, [number]>(
	`SELECT ${WH} FROM webhooks WHERE project_id = ? AND active = 1`,
);
export const insertWebhook = db.query<null, [number, string]>(
	`INSERT INTO webhooks (project_id, url) VALUES (?, ?)`,
);
export const setWebhookStatus = db.query<null, [number, number]>(
	`UPDATE webhooks SET last_status = ? WHERE id = ?`,
);
export const setWebhookActive = db.query<null, [number, number, number]>(
	`UPDATE webhooks SET active = ? WHERE id = ? AND project_id = ?`,
);
export const deleteWebhook = db.query<null, [number, number]>(
	`DELETE FROM webhooks WHERE id = ? AND project_id = ?`,
);

export interface ForwardRow {
	id: number;
	projectId: number;
	projectName: string;
	fromAddr: string;
	subject: string;
	body: string;
	createdAt: string;
}
const FW = `f.id, f.project_id AS projectId, p.name AS projectName, f.from_addr AS fromAddr, f.subject, f.body, f.created_at AS createdAt`;
export const insertForward = db.query<{ id: number }, [number, string, string, string]>(
	`INSERT INTO forwards (project_id, from_addr, subject, body) VALUES (?, ?, ?, ?) RETURNING id`,
);
export const findForward = db.query<ForwardRow, [number]>(
	`SELECT ${FW} FROM forwards f JOIN projects p ON p.id = f.project_id WHERE f.id = ?`,
);
