/** /api/v1 — token-authenticated JSON API (CLI, scripts, AI agents). */
import { Hono } from "hono";
import type { AppEnv } from "../inertia-middleware";
import * as api from "../handlers/api";

export const apiV1Routes = () => {
	const app = new Hono<AppEnv>();
	app.use("/api/v1/*", api.tokenAuth);
	app.get("/api/v1/me", api.whoami);
	app.get("/api/v1/projects", api.listProjects);
	app.get("/api/v1/projects/:projectId", api.getProject);
	app.get("/api/v1/projects/:projectId/todos", api.listTodos);
	app.post("/api/v1/projects/:projectId/todos", api.createTodo);
	app.post("/api/v1/projects/:projectId/todos/:id/complete", api.completeTodo);
	app.get("/api/v1/projects/:projectId/messages", api.listMessages);
	app.post("/api/v1/projects/:projectId/messages", api.createMessage);
	app.post("/api/v1/comments", api.comment);
	app.get("/api/v1/activity", api.activity);
	app.get("/api/v1/search", api.searchApi);
	app.get("/api/v1/assignments", api.assignments);
	return app;
};
