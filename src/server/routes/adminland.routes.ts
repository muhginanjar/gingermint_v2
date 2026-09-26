/** /adminland — admin-only account management. */
import { Hono } from "hono";
import { requireRole } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as adminland from "../handlers/adminland";

export const adminlandRoutes = () => {
	const app = new Hono<AppEnv>();
	app.use("/adminland", requireRole("admin"));
	app.use("/adminland/*", requireRole("admin"));
	app.get("/adminland", adminland.index);
	app.patch("/adminland/account", adminland.saveAccount);
	app.post("/adminland/people", adminland.invite);
	app.patch("/adminland/people/:id", adminland.updatePerson);
	app.delete("/adminland/people/:id", adminland.removePerson);
	app.post("/adminland/templates", adminland.newTemplate);
	return app;
};
