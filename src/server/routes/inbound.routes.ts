/** /inbound/:token — inbound email webhook (forward emails into a project). */
import { Hono } from "hono";
import type { AppEnv } from "../inertia-middleware";
import { receive } from "../handlers/inbound";

export const inboundRoutes = () => {
	const app = new Hono<AppEnv>();
	app.post("/inbound/:token", receive);
	return app;
};
