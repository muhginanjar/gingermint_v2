/**
 * File storage for Docs & Files, chat/ping media, voice notes and project
 * logos. Bytes are written next to tus uploads (UPLOAD_DIR/<id>); metadata
 * lives in `attachments`. Served only through /files/:id after an access
 * check, with safe headers (see handlers/files.ts).
 */
import type { Attachment } from "../../shared/models";
import type { User } from "../../shared/types";
import { findAttachment, findAttachments, insertAttachment, type AttachmentRow } from "../queries/vault";
import { generateUploadId } from "../tus-protocol";
import { readBytes, writeBytes } from "../tus-storage";
import { loadProject } from "./access";
import { InputError, NotFoundError } from "./errors";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function kindOf(mime: string): Attachment["kind"] {
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("audio/")) return "voice";
	if (mime.startsWith("video/")) return "video";
	return "file";
}

export const toAttachment = (r: AttachmentRow): Attachment => ({
	id: r.id,
	filename: r.filename,
	mime: r.mime,
	size: r.size,
	kind: kindOf(r.mime),
	url: `/files/${r.id}`,
});

export function attachmentMap(ids: (string | null)[]): Map<string, Attachment> {
	const list = ids.filter((i): i is string => !!i);
	if (list.length === 0) return new Map();
	return new Map(findAttachments.all(JSON.stringify(list)).map((r) => [r.id, toAttachment(r)]));
}

const sanitizeName = (name: string): string =>
	[...name]
		.filter((ch) => ch.charCodeAt(0) >= 32)
		.join("")
		.replace(/[\\/"<>]/g, "_")
		.slice(0, 200) || "file";

export async function saveUpload(
	user: User,
	projectId: number | null,
	file: Blob,
	filename: string,
): Promise<Attachment> {
	if (projectId) loadProject(user, projectId);
	if (file.size === 0) throw new InputError({ file: "That file is empty." });
	if (file.size > MAX_UPLOAD_BYTES) throw new InputError({ file: "Files must be under 100 MB." });
	const mime = (file.type || "application/octet-stream").split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
	const id = generateUploadId();
	await writeBytes(id, new Uint8Array(await file.arrayBuffer()));
	const name = sanitizeName(filename);
	insertAttachment.run(id, projectId, user.id, name, mime, file.size, kindOf(mime));
	return { id, filename: name, mime, size: file.size, kind: kindOf(mime), url: `/files/${id}` };
}

/** Load an attachment's bytes after checking the viewer may see it. */
export async function openAttachment(user: User, id: string): Promise<{ row: AttachmentRow; bytes: Uint8Array }> {
	if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new NotFoundError();
	const row = findAttachment.get(id);
	if (!row) throw new NotFoundError();
	if (row.projectId) loadProject(user, row.projectId);
	const bytes = new Uint8Array(await readBytes(id));
	return { row, bytes };
}
