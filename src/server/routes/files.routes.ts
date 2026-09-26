/** /files — multipart uploads + authenticated downloads (see handlers/files.ts). */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as files from "../handlers/files";

export const filesRoutes = () => {
	const app = new Hono<AppEnv>();
	app.post("/files", requireAuth, files.upload);
	app.get("/files/:id", requireAuth, files.serve);
	return app;
};
