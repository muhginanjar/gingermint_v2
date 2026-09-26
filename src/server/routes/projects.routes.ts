/**
 * /projects — project page (toolbox), settings, tools, people, templates,
 * integrations, plus every project tool (each tool's handlers live in its
 * own file under handlers/).
 */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as projects from "../handlers/projects";
import * as messages from "../handlers/messages";
import * as todos from "../handlers/todos";
import * as cards from "../handlers/cards";
import * as docs from "../handlers/docs";
import * as schedule from "../handlers/schedule";
import * as chat from "../handlers/chat";
import * as checkins from "../handlers/checkins";
import * as timesheet from "../handlers/timesheet";

export const projectsRoutes = () => {
	const app = new Hono<AppEnv>();
	app.use("/projects", requireAuth);
	app.use("/projects/*", requireAuth);

	// Project
	app.get("/projects", (c) => c.var.inertia.redirect("/home", 302));
	app.get("/projects/new", projects.newPage);
	app.post("/projects", projects.create);
	app.get("/projects/:id", projects.show);
	app.get("/projects/:id/edit", projects.editPage);
	app.patch("/projects/:id", projects.update);
	app.delete("/projects/:id", projects.destroy);
	app.post("/projects/:id/logo", projects.setLogo);
	app.post("/projects/:id/archive", projects.archive);
	app.post("/projects/:id/star", projects.star);
	app.post("/projects/:id/notify", projects.setNotify);
	app.post("/projects/:id/folder", projects.moveToFolder);
	app.post("/projects/:id/template", projects.saveAsTemplate);

	// Tools (toolbox)
	app.post("/projects/:id/tools", projects.addTool);
	app.post("/projects/:id/tools/reorder", projects.reorderTools);
	app.patch("/projects/:id/tools/:toolId", projects.renameTool);
	app.delete("/projects/:id/tools/:toolId", projects.removeTool);

	// People & invitations
	app.get("/projects/:id/people", projects.peoplePage);
	app.post("/projects/:id/people", projects.invite);
	app.delete("/projects/:id/people/:personId", projects.removePerson);

	// Integrations (webhooks + inbound email)
	app.get("/projects/:id/integrations", projects.integrationsPage);
	app.post("/projects/:id/webhooks", projects.addWebhook);
	app.patch("/projects/:id/webhooks/:hookId", projects.toggleWebhook);
	app.delete("/projects/:id/webhooks/:hookId", projects.removeWebhook);

	// Message Board
	app.get("/projects/:projectId/messages", messages.index);
	app.get("/projects/:projectId/messages/new", messages.newPage);
	app.post("/projects/:projectId/messages", messages.create);
	app.get("/projects/:projectId/messages/:id", messages.show);
	app.get("/projects/:projectId/messages/:id/edit", messages.editPage);
	app.patch("/projects/:projectId/messages/:id", messages.update);
	app.post("/projects/:projectId/messages/:id/pin", messages.pin);
	app.delete("/projects/:projectId/messages/:id", messages.destroy);

	// To-dos
	app.get("/projects/:projectId/todos", todos.index);
	app.post("/projects/:projectId/todos", todos.create);
	app.post("/projects/:projectId/todos/lists", todos.createList);
	app.post("/projects/:projectId/todos/lists/reorder", todos.reorderLists);
	app.get("/projects/:projectId/todos/lists/:id", todos.showList);
	app.patch("/projects/:projectId/todos/lists/:id", todos.updateList);
	app.delete("/projects/:projectId/todos/lists/:id", todos.destroyList);
	app.post("/projects/:projectId/todos/lists/:id/track", todos.track);
	app.post("/projects/:projectId/todos/lists/:id/hill", todos.hill);
	app.get("/projects/:projectId/todos/:id", todos.show);
	app.patch("/projects/:projectId/todos/:id", todos.update);
	app.post("/projects/:projectId/todos/:id/complete", todos.toggle);
	app.post("/projects/:projectId/todos/:id/move", todos.move);
	app.delete("/projects/:projectId/todos/:id", todos.destroy);

	// Card Table
	app.get("/projects/:projectId/cards", cards.index);
	app.post("/projects/:projectId/cards", cards.create);
	app.post("/projects/:projectId/cards/columns", cards.addColumn);
	app.post("/projects/:projectId/cards/columns/reorder", cards.reorderColumns);
	app.patch("/projects/:projectId/cards/columns/:id", cards.updateColumn);
	app.delete("/projects/:projectId/cards/columns/:id", cards.destroyColumn);
	app.patch("/projects/:projectId/cards/steps/:id", cards.updateStep);
	app.delete("/projects/:projectId/cards/steps/:id", cards.destroyStep);
	app.get("/projects/:projectId/cards/:id", cards.show);
	app.patch("/projects/:projectId/cards/:id", cards.update);
	app.post("/projects/:projectId/cards/:id/move", cards.move);
	app.post("/projects/:projectId/cards/:id/steps", cards.addStep);
	app.delete("/projects/:projectId/cards/:id", cards.destroy);

	// Docs & Files
	app.get("/projects/:projectId/docs", docs.index);
	app.get("/projects/:projectId/docs/new", docs.newDoc);
	app.post("/projects/:projectId/docs", docs.create);
	app.post("/projects/:projectId/docs/move", docs.move);
	app.post("/projects/:projectId/docs/delete", docs.bulkDelete);
	app.post("/projects/:projectId/docs/visibility", docs.visibility);
	app.get("/projects/:projectId/docs/folders/:id", docs.folder);
	app.get("/projects/:projectId/docs/:id", docs.show);
	app.get("/projects/:projectId/docs/:id/edit", docs.editDoc);
	app.patch("/projects/:projectId/docs/:id", docs.update);
	app.delete("/projects/:projectId/docs/:id", docs.destroy);

	// Schedule
	app.get("/projects/:projectId/schedule", schedule.projectSchedule);
	app.get("/projects/:projectId/schedule/new", schedule.newPage);
	app.post("/projects/:projectId/schedule", schedule.create);
	app.get("/projects/:projectId/schedule/:id", schedule.show);
	app.get("/projects/:projectId/schedule/:id/edit", schedule.editPage);
	app.patch("/projects/:projectId/schedule/:id", schedule.update);
	app.delete("/projects/:projectId/schedule/:id", schedule.destroy);

	// Chat
	app.get("/projects/:projectId/chat", chat.index);
	app.get("/projects/:projectId/chat/lines", chat.poll);
	app.post("/projects/:projectId/chat/lines", chat.say);
	app.delete("/projects/:projectId/chat/lines/:id", chat.destroy);

	// Automatic Check-ins
	app.get("/projects/:projectId/checkins", checkins.index);
	app.get("/projects/:projectId/checkins/new", checkins.newPage);
	app.post("/projects/:projectId/checkins", checkins.create);
	app.get("/projects/:projectId/checkins/answers/:id", checkins.showAnswer);
	app.patch("/projects/:projectId/checkins/answers/:id", checkins.updateAnswer);
	app.delete("/projects/:projectId/checkins/answers/:id", checkins.destroyAnswer);
	app.get("/projects/:projectId/checkins/:id", checkins.show);
	app.get("/projects/:projectId/checkins/:id/edit", checkins.editPage);
	app.patch("/projects/:projectId/checkins/:id", checkins.update);
	app.delete("/projects/:projectId/checkins/:id", checkins.destroy);
	app.post("/projects/:projectId/checkins/:id/answers", checkins.answer);

	// Timesheet
	app.get("/projects/:projectId/timesheet", timesheet.index);
	app.post("/projects/:projectId/timesheet", timesheet.create);
	app.delete("/projects/:projectId/timesheet/:id", timesheet.destroy);

	return app;
};
