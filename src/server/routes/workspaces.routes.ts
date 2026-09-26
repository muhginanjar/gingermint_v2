/** /workspaces — list, create and switch workspaces. */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as workspaces from "../handlers/workspaces";

export const workspacesRoutes = () => {
	const app = new Hono<AppEnv>();
	app.get("/workspaces", requireAuth, workspaces.index);
	app.post("/workspaces", requireAuth, workspaces.create);
	app.post("/workspaces/:id/switch", requireAuth, workspaces.switchTo);
	return app;
};
