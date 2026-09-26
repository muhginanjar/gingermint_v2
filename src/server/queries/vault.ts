/** Docs & Files (vault items) and uploaded attachments. */
import { db } from "../db";

export interface AttachmentRow {
	id: string;
	projectId: number | null;
	userId: number | null;
	filename: string;
	mime: string;
	size: number;
	kind: string;
	createdAt: string;
}
const ATT_COLS = `id, project_id AS projectId, user_id AS userId, filename, mime, size, kind, created_at AS createdAt`;

export const insertAttachment = db.query<
	null,
	[string, number | null, number, string, string, number, string]
>(
	`INSERT INTO attachments (id, project_id, user_id, filename, mime, size, kind) VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
export const findAttachment = db.query<AttachmentRow, [string]>(
	`SELECT ${ATT_COLS} FROM attachments WHERE id = ?`,
);
export const findAttachments = db.query<AttachmentRow, [string]>(
	`SELECT ${ATT_COLS} FROM attachments WHERE id IN (SELECT value FROM json_each(?))`,
);
export const deleteAttachment = db.query<null, [string]>(`DELETE FROM attachments WHERE id = ?`);

export interface VaultItemRow {
	id: number;
	projectId: number;
	parentId: number | null;
	kind: string;
	title: string;
	body: string;
	color: string;
	url: string | null;
	description: string;
	imageUrl: string | null;
	attachmentId: string | null;
	clientVisible: number;
	createdBy: number | null;
	createdAt: string;
	updatedAt: string;
	childCount: number;
	commentCount: number;
}
const COLS = `v.id, v.project_id AS projectId, v.parent_id AS parentId, v.kind, v.title, v.body, v.color, v.url,
  v.description, v.image_url AS imageUrl, v.attachment_id AS attachmentId, v.client_visible AS clientVisible,
  v.created_by AS createdBy, v.created_at AS createdAt, v.updated_at AS updatedAt,
  (SELECT COUNT(*) FROM vault_items k WHERE k.parent_id = v.id) AS childCount,
  (SELECT COUNT(*) FROM comments c WHERE c.recordable_type = v.kind AND c.recordable_id = v.id) AS commentCount`;

export const listVaultChildren = db.query<VaultItemRow, [number, number | null, number]>(
	`SELECT ${COLS} FROM vault_items v WHERE v.project_id = ?1 AND v.parent_id IS ?2
     AND (?3 = 0 OR v.client_visible = 1)
   ORDER BY v.kind != 'folder', v.title COLLATE NOCASE`,
);
export const listVaultAll = db.query<VaultItemRow, [number, number]>(
	`SELECT ${COLS} FROM vault_items v WHERE v.project_id = ?1 AND (?2 = 0 OR v.client_visible = 1)
   ORDER BY v.kind != 'folder', v.title COLLATE NOCASE`,
);
export const listVaultFolders = db.query<VaultItemRow, [number]>(
	`SELECT ${COLS} FROM vault_items v WHERE v.project_id = ? AND v.kind = 'folder' ORDER BY v.title COLLATE NOCASE`,
);
export const findVaultItem = db.query<VaultItemRow, [number]>(
	`SELECT ${COLS} FROM vault_items v WHERE v.id = ?`,
);
export const insertVaultItem = db.query<
	{ id: number },
	[
		number, number | null, string, string, string, string, string | null, string,
		string | null, string | null, number, number,
	]
>(
	`INSERT INTO vault_items (project_id, parent_id, kind, title, body, color, url, description, image_url,
     attachment_id, client_visible, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateVaultItem = db.query<
	null,
	[string, string, string, string | null, string, string | null, number, string, number]
>(
	`UPDATE vault_items SET title = ?, body = ?, color = ?, url = ?, description = ?, image_url = ?,
     client_visible = ?, updated_at = ? WHERE id = ?`,
);
export const moveVaultItem = db.query<null, [number | null, string, number]>(
	`UPDATE vault_items SET parent_id = ?, updated_at = ? WHERE id = ?`,
);
export const deleteVaultItem = db.query<null, [number]>(`DELETE FROM vault_items WHERE id = ?`);
