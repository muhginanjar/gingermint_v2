/**
 * Domain errors thrown by services/handlers and mapped centrally in
 * app.ts onError: NotFound → NotFound page (404), Forbidden → 403,
 * InputError → redirect back with field errors (Inertia) or 422 JSON (fetch).
 */
export class NotFoundError extends Error {
	constructor(what = "Not found") {
		super(what);
		this.name = "NotFoundError";
	}
}

export class ForbiddenError extends Error {
	constructor(message = "You don't have access to that.") {
		super(message);
		this.name = "ForbiddenError";
	}
}

export class InputError extends Error {
	constructor(readonly errors: Record<string, string>) {
		super("Invalid input");
		this.name = "InputError";
	}
}

/** The record lives in another workspace the viewer belongs to — switch and retry. */
export class WorkspaceSwitch extends Error {
	constructor(readonly accountId: number) {
		super("Switching workspace");
		this.name = "WorkspaceSwitch";
	}
}
