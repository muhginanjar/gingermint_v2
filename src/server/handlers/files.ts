/**
 * Uploads (multipart, ≤100 MB) and authenticated file serving.
 * Images/audio/video/PDF render inline; everything else downloads as an
 * attachment. nosniff + a sandboxing CSP stop uploaded HTML/SVG from running.
 */
import { openAttachment, saveUpload } from "../services/attachments";
import { InputError } from "../services/errors";
import { type Ctx, me, num } from "./http";

const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|audio\/|video\/|application\/pdf$)/;

export async function upload(c: Ctx) {
	const user = me(c);
	let form: FormData;
	try {
		form = await c.req.formData();
	} catch {
		throw new InputError({ file: "Upload a file." });
	}
	const projectId = num(form.get("projectId"));
	const files = form.getAll("file").filter((f): f is File => f instanceof Blob);
	if (files.length === 0) throw new InputError({ file: "Upload a file." });
	const saved = [];
	for (const f of files) saved.push(await saveUpload(user, projectId, f, (f as File).name || "file"));
	return c.json({ files: saved });
}

export async function serve(c: Ctx) {
	const user = me(c);
	const { row, bytes } = await openAttachment(user, c.req.param("id") ?? "");
	const inline = INLINE.test(row.mime) && c.req.query("download") === undefined;
	const encoded = encodeURIComponent(row.filename);
	return new Response(new Uint8Array(bytes), {
		headers: {
			"content-type": inline ? row.mime : "application/octet-stream",
			"content-length": String(bytes.byteLength),
			"content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`,
			"cache-control": "private, max-age=86400",
			"x-content-type-options": "nosniff",
			"content-security-policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
		},
	});
}
