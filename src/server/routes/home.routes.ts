/** /home (Home screen) and /folders (project folders). */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as home from "../handlers/home";

export const homeRoutes = () => {
	const app = new Hono<AppEnv>();
	app.get("/home", requireAuth, home.index);
	app.post("/folders", requireAuth, home.createFolder);
	app.patch("/folders/:id", requireAuth, home.updateFolder);
	app.delete("/folders/:id", requireAuth, home.deleteFolder);
	return app;
};
