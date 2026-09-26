/**
 * fetch() helpers for JSON endpoints (polling, My Bar, uploads). Same-origin
 * requests carry the Origin header, which is what the server's CSRF check
 * verifies; the session cookie is SameSite=Lax.
 */
export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly errors: Record<string, string> = {},
	) {
		super(Object.values(errors)[0] ?? `Request failed (${status})`);
	}
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: {
			accept: "application/json",
			...(body !== undefined && !(body instanceof FormData) ? { "content-type": "application/json" } : {}),
		},
		body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
		credentials: "same-origin",
	});
	if (res.redirected && new URL(res.url).pathname === "/login") {
		window.location.href = "/login";
		throw new ApiError(401);
	}
	const text = await res.text();
	let data: unknown = null;
	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = null;
	}
	if (!res.ok) {
		const d = data as { errors?: Record<string, string>; error?: string } | null;
		throw new ApiError(res.status, d?.errors ?? (d?.error ? { error: d.error } : {}));
	}
	return data as T;
}

export const api = {
	get: <T>(url: string) => request<T>("GET", url),
	post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
	put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body ?? {}),
	patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body ?? {}),
	delete: <T>(url: string) => request<T>("DELETE", url),
};

export interface UploadedFile {
	id: string;
	filename: string;
	mime: string;
	size: number;
	kind: "file" | "image" | "voice" | "video";
	url: string;
}

/** Upload files (multipart). `projectId` null = personal (pings). */
export async function uploadFiles(files: (File | Blob)[], projectId: number | null, names?: string[]): Promise<UploadedFile[]> {
	const form = new FormData();
	if (projectId) form.set("projectId", String(projectId));
	for (const [i, f] of files.entries()) form.append("file", f, names?.[i] ?? (f instanceof File ? f.name : "file"));
	const res = await request<{ files: UploadedFile[] }>("POST", "/files", form);
	return res.files;
}
