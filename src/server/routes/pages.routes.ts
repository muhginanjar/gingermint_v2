/**
 * Page routes: the public landing page (/) plus legacy redirects.
 * `/` is a **public, CDN-cacheable** page rendered with `{ public: true }`;
 * the client fetches identity via `GET /api/session`.
 */
import { Hono } from "hono";
import { cacheablePublic } from "../cache";
import type { AppEnv } from "../inertia-middleware";

export const pageRoutes = () => {
	const app = new Hono<AppEnv>();
	app.use("/", cacheablePublic(300, 600));
	app.get("/", (c) => c.var.inertia.render("Home", {}, { public: true }));
	app.get("/dashboard", (c) => c.var.inertia.redirect("/home", 302));
	app.get("/admin", (c) => c.var.inertia.redirect("/adminland", 302));
	return app;
};
