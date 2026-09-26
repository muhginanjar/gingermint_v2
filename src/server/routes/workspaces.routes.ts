/** /workspaces — list, create, switch, rename, leave and delete workspaces. */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as workspaces from "../handlers/workspaces";

export const workspacesRoutes = () => {
	const app = new Hono<AppEnv>();
	app.get("/workspaces", requireAuth, workspaces.index);
	app.post("/workspaces", requireAuth, workspaces.create);
	app.post("/workspaces/:id/switch", requireAuth, workspaces.switchTo);
	app.patch("/workspaces/:id", requireAuth, workspaces.rename);
	app.post("/workspaces/:id/leave", requireAuth, workspaces.leave);
	app.delete("/workspaces/:id", requireAuth, workspaces.destroy);
	return app;
};
