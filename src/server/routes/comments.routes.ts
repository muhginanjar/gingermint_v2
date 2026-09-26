/** /comments, /reactions, /subscriptions — work on any recordable. */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as comments from "../handlers/comments";

export const commentsRoutes = () => {
	const app = new Hono<AppEnv>();
	app.post("/comments", requireAuth, comments.create);
	app.patch("/comments/:id", requireAuth, comments.update);
	app.delete("/comments/:id", requireAuth, comments.destroy);
	app.post("/reactions", requireAuth, comments.react);
	app.post("/subscriptions", requireAuth, comments.subscribe);
	return app;
};
