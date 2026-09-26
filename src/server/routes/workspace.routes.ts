/**
 * Account-wide views reached from the universal menu: /activity, /calendar,
 * /reports, /everything, /search, /people, /pings — and the personal /my/*
 * endpoints that feed My Bar and New for You.
 */
import { Hono } from "hono";
import { requireAuth } from "../auth";
import type { AppEnv } from "../inertia-middleware";
import * as activity from "../handlers/activity";
import * as discovery from "../handlers/discovery";
import * as my from "../handlers/my";
import * as pings from "../handlers/pings";
import * as schedule from "../handlers/schedule";
import * as interactions from "../handlers/comments";

export const workspaceRoutes = () => {
	const app = new Hono<AppEnv>();
	for (const p of ["/activity", "/reports", "/everything", "/search", "/people", "/pings", "/my"]) {
		app.use(p, requireAuth);
		app.use(`${p}/*`, requireAuth);
	}

	app.get("/activity", activity.index);
	app.get("/activity/more", activity.more);

	// Not a /calendar/* wildcard: the ICS feed below is authenticated by its token.
	app.get("/calendar", requireAuth, schedule.calendar);
	app.post("/calendar/rotate", requireAuth, schedule.rotateFeed);
	app.get("/calendar/reminders", requireAuth, schedule.reminders);

	app.get("/reports", discovery.reports);
	app.get("/reports/:kind", discovery.reports);

	app.get("/everything", discovery.everything);
	app.get("/everything/:kind", discovery.everything);

	app.get("/search", discovery.search);
	app.get("/search/jump", discovery.jump);

	app.get("/people/:id", discovery.person);

	app.get("/pings", pings.index);
	app.post("/pings", pings.start);
	app.get("/pings/threads", pings.threadsJson);
	app.get("/pings/people", pings.people);
	app.get("/pings/:id", pings.show);
	app.get("/pings/:id/messages", pings.poll);
	app.post("/pings/:id/messages", pings.send);
	app.post("/pings/:id/messages/:messageId/react", pings.react);

	app.get("/my/notifications", my.notifications);
	app.get("/my/counts", my.counts);
	app.post("/my/notifications/read", my.readAll);
	app.post("/my/notifications/:id/read", my.readOne);
	app.delete("/my/notifications/:id", my.dismiss);
	app.post("/my/notifications/:id/unbubble", my.cancelBubble);
	app.get("/my/tasks", my.tasks);
	app.get("/my/events", my.events);
	app.get("/my/today", my.dueToday);
	app.get("/my/bookmarks", my.bookmarks);
	app.post("/my/bookmarks", interactions.bookmark);
	app.delete("/my/bookmarks/:id", my.removeBookmark);
	app.get("/my/notes", my.note);
	app.put("/my/notes", my.saveNote);
	app.post("/my/bubble-ups", interactions.bubbleUp);

	return app;
};

/** Public (token-authenticated) calendar feed. */
export const calendarFeedRoutes = () => {
	const app = new Hono<AppEnv>();
	app.get("/calendar/feed/:token", schedule.feed);
	return app;
};
