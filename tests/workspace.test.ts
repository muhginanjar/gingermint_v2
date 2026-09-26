/**
 * Workspace E2E: drives the Basecamp-style features through app.request()
 * against an in-memory database (same harness as app.test.ts).
 * Run with: bun test --isolate
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";

let app: Awaited<ReturnType<typeof import("../src/server/app")["createApp"]>>;
const BASE = "http://localhost:3000";
const xhr = { "x-inertia": "true", "x-inertia-version": "test-version" };
const json = { accept: "application/json" };

beforeAll(async () => {
	process.env.DATABASE_PATH = ":memory:";
	process.env.APP_URL = BASE;
	process.env.UPLOAD_DIR = `/tmp/gm-test-uploads-${process.pid}`;
	process.env.RATE_LIMIT_AUTH_MAX = "1000";
	process.env.RATE_LIMIT_GLOBAL_MAX = "100000";
	const { buildClientAssets } = await import("../src/server/assets");
	await buildClientAssets();
	const { createApp } = await import("../src/server/app");
	app = createApp({ version: "test-version", js: "app.js", css: "app.css" });
});

afterAll(async () => {
	const { db } = await import("../src/server/db");
	db.close();
});

interface Opts {
	method?: string;
	headers?: Record<string, string>;
	body?: unknown;
	cookie?: string;
	form?: FormData;
}

async function call(path: string, o: Opts = {}): Promise<Response> {
	const headers = new Headers(o.headers);
	if (o.cookie) headers.set("cookie", o.cookie);
	let body: BodyInit | undefined;
	if (o.form) body = o.form;
	else if (o.body !== undefined) {
		headers.set("content-type", "application/json");
		body = JSON.stringify(o.body);
	}
	return app.request(`${BASE}${path}`, { method: o.method ?? "GET", headers, body });
}

const cookieOf = (res: Response) => {
	const h = res.headers as Headers & { getSetCookie?: () => string[] };
	const all = h.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
	return all.find((c) => c.startsWith("session="))?.split(";")[0] ?? "";
};

async function signUp(name: string, email: string): Promise<string> {
	const res = await call("/register", { method: "POST", headers: xhr, body: { name, email, password: "password123" } });
	expect(res.status).toBe(303);
	return cookieOf(res);
}

// biome-ignore lint/suspicious/noExplicitAny: test helper returns untyped Inertia payloads
async function page(path: string, cookie: string): Promise<any> {
	const res = await call(path, { headers: xhr, cookie });
	expect(res.status).toBe(200);
	return res.json();
}

const post = (path: string, cookie: string, body: unknown = {}, method = "POST") =>
	call(path, { method, headers: xhr, cookie, body });

let owner = "";
let member = "";
let client = "";
let ownerId = 0;
let memberId = 0;
let clientId = 0;
let projectId = 0;

describe("accounts & projects", () => {
	it("makes the first person the admin and lands everyone on /home", async () => {
		owner = await signUp("Olivia Owner", "olivia@example.com");
		member = await signUp("Max Member", "max@example.com");
		client = await signUp("Cleo Client", "cleo@client.com");
		const home = await page("/home", owner);
		expect(home.component).toBe("home/Index");
		expect(home.props.isAdmin).toBe(true);
		expect(home.props.chrome.accountName).toBe("GingerMint");
		ownerId = home.props.auth.user.id;
		const m = await page("/home", member);
		expect(m.props.isAdmin).toBe(false);
		memberId = m.props.auth.user.id;
		clientId = (await page("/home", client)).props.auth.user.id;
	});

	it("creates a project with the default toolbox and card table columns", async () => {
		const res = await post("/projects", owner, { name: "Logo Redesign", description: "New mark for GH Designs", color: "orange", icon: "🎨" });
		expect(res.status).toBe(303);
		projectId = Number(new URL(res.headers.get("location") ?? "").pathname.split("/").pop());
		const p = await page(`/projects/${projectId}`, owner);
		expect(p.component).toBe("projects/Show");
		expect(p.props.project.tools.map((t: { kind: string }) => t.kind)).toEqual([
			"message_board", "todos", "docs", "chat", "schedule", "card_table",
		]);
		expect(p.props.previews.card_table.map((c: { name: string }) => c.name)).toContain("Triage");
		expect(p.props.activity[0].action).toBe("created");
	});

	it("validates project input and flashes errors back", async () => {
		const res = await call("/projects", { method: "POST", headers: { ...xhr, referer: `${BASE}/projects/new` }, cookie: owner, body: { name: "" } });
		expect(res.status).toBe(303);
		expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/projects/new");
		const form = await page("/projects/new", owner);
		expect(form.props.errors.name).toBeTruthy();
	});

	it("hides projects from non-members (404, no leak)", async () => {
		const res = await call(`/projects/${projectId}`, { headers: xhr, cookie: member });
		expect(res.status).toBe(404);
	});

	it("invites existing people and new emails; clients join with limited access", async () => {
		const { sentMails } = await import("../src/server/mailer");
		const before = sentMails.length;
		let res = await post(`/projects/${projectId}/people`, owner, { userIds: [memberId], emails: "newbie@example.com", role: "member" });
		expect(res.status).toBe(303);
		expect(sentMails.length).toBe(before + 1);
		expect(sentMails.at(-1)?.subject).toContain("invited you");
		res = await post(`/projects/${projectId}/people`, owner, { userIds: [clientId], role: "client" });
		expect(res.status).toBe(303);
		const people = await page(`/projects/${projectId}/people`, owner);
		const roles = Object.fromEntries(people.props.project.people.map((p: { email: string; role: string }) => [p.email, p.role]));
		expect(roles["max@example.com"]).toBe("member");
		expect(roles["cleo@client.com"]).toBe("client");
		expect(roles["newbie@example.com"]).toBe("member");
		const asClient = await page(`/projects/${projectId}`, client);
		expect(asClient.props.project.myRole).toBe("client");
		expect(asClient.props.project.tools.map((t: { kind: string }) => t.kind)).not.toContain("chat");
		expect((await call(`/projects/${projectId}/chat`, { headers: xhr, cookie: client })).status).toBe(403);
	});

	it("adds, renames, reorders and removes tools", async () => {
		await post(`/projects/${projectId}/tools`, owner, { kind: "checkins" });
		await post(`/projects/${projectId}/tools`, owner, { kind: "timesheet" });
		let p = await page(`/projects/${projectId}`, owner);
		const tools = p.props.project.tools as { id: number; kind: string }[];
		expect(tools.map((t) => t.kind)).toContain("checkins");
		const ids = tools.map((t) => t.id).reverse();
		await post(`/projects/${projectId}/tools/reorder`, owner, { ids });
		const chat = tools.find((t) => t.kind === "chat");
		await post(`/projects/${projectId}/tools/${chat?.id}`, owner, { name: "Campfire" }, "PATCH");
		p = await page(`/projects/${projectId}`, owner);
		expect(p.props.project.tools[0].kind).toBe("timesheet");
		expect(p.props.project.tools.find((t: { kind: string }) => t.kind === "chat").name).toBe("Campfire");
	});

	it("stars, files into folders, and edits project details", async () => {
		await post("/folders", owner, { name: "Client work", color: "pink" });
		let home = await page("/home", owner);
		const folder = home.props.folders[0];
		await post(`/projects/${projectId}/folder`, owner, { folderId: folder.id });
		await post(`/projects/${projectId}/star`, owner, { starred: true });
		await post(`/projects/${projectId}`, owner, {
			name: "Logo Redesign", description: "New mark", icon: "🎨", color: "orange", folderId: folder.id,
			leadId: memberId, phase: "Phase 2", status: "at_risk", startOn: "2026-09-01", endOn: "2026-10-30", access: "invite",
		}, "PATCH");
		home = await page("/home", owner);
		const proj = home.props.projects.find((x: { id: number }) => x.id === projectId);
		expect(proj.starred).toBe(true);
		expect(proj.folderId).toBe(folder.id);
		expect(proj.lead.id).toBe(memberId);
		expect(proj.phase).toBe("Phase 2");
		expect(home.props.folders[0].projectCount).toBe(1);
	});
});

describe("message board, comments, mentions, notifications", () => {
	let messageId = 0;
	it("posts a message and notifies members (not clients for internal posts)", async () => {
		const res = await post(`/projects/${projectId}/messages`, owner, { title: "Kickoff notes", body: `Hi @[Max Member](mention:${memberId}) — **welcome**`, category: "Announcement" });
		expect(res.status).toBe(303);
		messageId = Number(new URL(res.headers.get("location") ?? "").pathname.split("/").pop());
		const feed = await (await call("/my/notifications", { headers: json, cookie: member })).json();
		expect(feed.unread.some((n: { kind: string }) => n.kind === "mention")).toBe(true);
		const clientFeed = await (await call("/my/notifications", { headers: json, cookie: client })).json();
		expect(clientFeed.unread.length).toBe(0);
		expect((await call(`/projects/${projectId}/messages/${messageId}`, { headers: xhr, cookie: client })).status).toBe(404);
	});

	it("comments notify subscribers; visiting the page marks them read", async () => {
		await post("/comments", member, { type: "message", id: messageId, body: "Thanks! Looks great." });
		const feed = await (await call("/my/notifications", { headers: json, cookie: owner })).json();
		const n = feed.unread.find((x: { kind: string }) => x.kind === "comment");
		expect(n?.title).toBe("Re: Kickoff notes");
		const show = await page(`/projects/${projectId}/messages/${messageId}`, owner);
		expect(show.props.comments.length).toBe(1);
		expect(show.props.subscribed).toBe(true);
		const after = await (await call("/my/counts", { headers: json, cookie: owner })).json();
		expect(after.unreadCount).toBe(0);
	});

	it("toggles emoji boosts", async () => {
		let r = await (await call("/reactions", { method: "POST", headers: json, cookie: member, body: { type: "message", id: messageId, emoji: "🎉" } })).json();
		expect(r.reactions[0]).toMatchObject({ emoji: "🎉", count: 1, mine: true });
		r = await (await call("/reactions", { method: "POST", headers: json, cookie: member, body: { type: "message", id: messageId, emoji: "🎉" } })).json();
		expect(r.reactions.length).toBe(0);
	});

	it("bubbles a notification up later and back", async () => {
		await post("/comments", owner, { type: "message", id: messageId, body: "One more thing" });
		let feed = await (await call("/my/notifications", { headers: json, cookie: member })).json();
		const n = feed.unread[0];
		const later = new Date(Date.now() + 3 * 3600_000).toISOString();
		await call("/my/bubble-ups", { method: "POST", headers: json, cookie: member, body: { notificationId: n.id, when: later } });
		feed = await (await call("/my/notifications", { headers: json, cookie: member })).json();
		expect(feed.unread.some((x: { id: number }) => x.id === n.id)).toBe(false);
		expect(feed.bubbled.some((x: { id: number }) => x.id === n.id)).toBe(true);
		await call(`/my/notifications/${n.id}/unbubble`, { method: "POST", headers: json, cookie: member });
		feed = await (await call("/my/notifications", { headers: json, cookie: member })).json();
		expect(feed.unread.some((x: { id: number }) => x.id === n.id)).toBe(true);
	});

	it("bubbles up any item as a private reminder", async () => {
		const past = await call("/my/bubble-ups", { method: "POST", headers: json, cookie: owner, body: { type: "message", id: messageId, when: "2020-01-01" } });
		expect(past.status).toBe(422);
		const ok = await call("/my/bubble-ups", { method: "POST", headers: json, cookie: owner, body: { type: "message", id: messageId, when: "tomorrow" } });
		expect(ok.status).toBe(200);
	});
});

describe("to-dos, subtasks, hill charts", () => {
	let listId = 0;
	let todoId = 0;
	it("creates lists, loose to-dos, assigned to-dos and subtasks", async () => {
		await post(`/projects/${projectId}/todos/lists`, owner, { name: "Launch", clientVisible: true });
		let o = await page(`/projects/${projectId}/todos`, owner);
		listId = o.props.lists[0].id;
		await post(`/projects/${projectId}/todos`, owner, { title: "Loose idea" });
		await post(`/projects/${projectId}/todos`, owner, { title: "Sketch directions", listId, assigneeIds: [memberId], notifyIds: [ownerId], dueOn: "2026-10-01" });
		o = await page(`/projects/${projectId}/todos`, owner);
		const sketch = o.props.todos.find((t: { title: string }) => t.title === "Sketch directions");
		todoId = sketch.id;
		expect(sketch.assignees[0].id).toBe(memberId);
		expect(o.props.todos.find((t: { title: string }) => t.title === "Loose idea").listId).toBeNull();
		await post(`/projects/${projectId}/todos`, owner, { title: "Refine top 3", parentId: todoId, assigneeIds: [memberId] });
		const show = await page(`/projects/${projectId}/todos/${todoId}`, owner);
		expect(show.props.todo.subtasks.length).toBe(1);
		expect(show.props.todo.notifyOnDone[0].id).toBe(ownerId);
		const feed = await (await call("/my/notifications", { headers: json, cookie: member })).json();
		expect(feed.unread.some((n: { kind: string }) => n.kind === "assignment")).toBe(true);
	});

	it("completing notifies 'when done' people; My Tasks lists assignments", async () => {
		const tasks = await (await call("/my/tasks", { headers: json, cookie: member })).json();
		expect(tasks.items.some((i: { title: string }) => i.title === "Sketch directions")).toBe(true);
		await call(`/projects/${projectId}/todos/${todoId}/complete`, { method: "POST", headers: json, cookie: member, body: { done: true } });
		const feed = await (await call("/my/notifications", { headers: json, cookie: owner })).json();
		expect(feed.unread.some((n: { title: string }) => n.title === "Completed: Sketch directions")).toBe(true);
		const o = await page(`/projects/${projectId}/todos`, owner);
		expect(o.props.lists[0].completed).toBe(1);
	});

	it("moves a loose to-do into a list", async () => {
		let o = await page(`/projects/${projectId}/todos`, owner);
		const loose = o.props.todos.find((t: { title: string }) => t.title === "Loose idea");
		await post(`/projects/${projectId}/todos/${loose.id}/move`, owner, { listId });
		o = await page(`/projects/${projectId}/todos`, owner);
		expect(o.props.todos.find((t: { id: number }) => t.id === loose.id).listId).toBe(listId);
	});

	it("tracks a list on the hill chart with history", async () => {
		await post(`/projects/${projectId}/todos/lists/${listId}/track`, owner, { tracked: true });
		await post(`/projects/${projectId}/todos/lists/${listId}/hill`, owner, { position: 72 });
		const o = await page(`/projects/${projectId}/todos`, owner);
		expect(o.props.lists[0].hillTracked).toBe(true);
		expect(o.props.lists[0].hillPosition).toBe(72);
		expect(o.props.hillUpdates[0].position).toBe(72);
	});

	it("shows clients only client-visible lists", async () => {
		await post(`/projects/${projectId}/todos/lists`, owner, { name: "Internal only" });
		const o = await page(`/projects/${projectId}/todos`, client);
		expect(o.props.lists.map((l: { name: string }) => l.name)).toEqual(["Launch"]);
	});
});

describe("card table", () => {
	it("adds cards, steps, moves across columns and on hold", async () => {
		let t = await page(`/projects/${projectId}/cards`, owner);
		const triage = t.props.columns.find((c: { kind: string }) => c.kind === "triage");
		const review = t.props.columns.find((c: { name: string }) => c.name === "Review");
		await post(`/projects/${projectId}/cards`, owner, { columnId: triage.id, title: "Client wants dark preview", assigneeIds: [memberId] });
		t = await page(`/projects/${projectId}/cards`, owner);
		const card = t.props.columns.find((c: { kind: string }) => c.kind === "triage").cards[0];
		await post(`/projects/${projectId}/cards/${card.id}/steps`, owner, { title: "Mock it" });
		await post(`/projects/${projectId}/cards/${card.id}/move`, owner, { columnId: review.id, onHold: true });
		t = await page(`/projects/${projectId}/cards`, owner);
		const moved = t.props.columns.find((c: { id: number }) => c.id === review.id).cards[0];
		expect(moved.onHold).toBe(true);
		expect(moved.stepsTotal).toBe(1);
		await post(`/projects/${projectId}/cards/columns`, owner, { name: "Client Approval", color: "blue" });
		t = await page(`/projects/${projectId}/cards`, owner);
		expect(t.props.columns.some((c: { name: string }) => c.name === "Client Approval")).toBe(true);
	});
});

describe("docs & files", () => {
	it("makes folders, docs, links and uploads with access-checked downloads", async () => {
		await post(`/projects/${projectId}/docs`, owner, { kind: "folder", title: "Final Designs", color: "blue", clientVisible: true });
		let v = await page(`/projects/${projectId}/docs`, owner);
		const folder = v.props.items.find((i: { kind: string }) => i.kind === "folder");
		const doc = await post(`/projects/${projectId}/docs`, owner, { kind: "doc", parentId: folder.id, title: "Project Scope", body: "# Scope\n\n| A | B |\n|---|---|\n| 1 | 2 |" });
		expect(doc.status).toBe(303);
		const bad = await call(`/projects/${projectId}/docs`, { method: "POST", headers: { ...xhr, referer: `${BASE}/projects/${projectId}/docs` }, cookie: owner, body: { kind: "link", title: "Figma", url: "javascript:alert(1)" } });
		expect(bad.status).toBe(303);
		await post(`/projects/${projectId}/docs`, owner, { kind: "link", title: "Figma file", url: "https://figma.com/file/abc" });

		const form = new FormData();
		form.set("projectId", String(projectId));
		form.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "evil.html");
		const up = await call("/files", { method: "POST", cookie: owner, form });
		expect(up.status).toBe(200);
		const { files } = await up.json();
		await post(`/projects/${projectId}/docs`, owner, { kind: "file", files: [{ attachmentId: files[0].id, title: files[0].filename }] });

		v = await page(`/projects/${projectId}/docs`, owner);
		expect(v.props.items.map((i: { kind: string }) => i.kind).sort()).toEqual(["doc", "file", "folder", "link"]);
		const dl = await call(files[0].url, { cookie: owner });
		expect(dl.status).toBe(200);
		expect(dl.headers.get("content-type")).toBe("application/octet-stream");
		expect(dl.headers.get("content-disposition")).toContain("attachment");
		expect((await call(files[0].url, { cookie: member })).status).toBe(200);
		const outsider = await signUp("Out Sider", "out@example.com");
		expect((await call(files[0].url, { cookie: outsider })).status).toBe(404);

		// Clients see only client-visible items (the folder), not the file/link.
		const cv = await page(`/projects/${projectId}/docs`, client);
		expect(cv.props.items.map((i: { title: string }) => i.title)).toEqual(["Final Designs"]);
	});
});

describe("schedule, calendar, reminders, ICS", () => {
	it("schedules events, shows them on the calendar, reminds, and serves ICS", async () => {
		const start = new Date(Date.now() + 10 * 60_000);
		const end = new Date(start.getTime() + 3600_000);
		const res = await post(`/projects/${projectId}/schedule`, owner, {
			title: "Design review", startsAt: start.toISOString(), endsAt: end.toISOString(), allDay: false,
			videoUrl: "https://zoom.us/j/123", participantIds: [memberId],
		});
		expect(res.status).toBe(303);
		const cal = await page("/calendar", member);
		expect(cal.props.entries.some((e: { title: string }) => e.title === "Design review")).toBe(true);
		expect(cal.props.entries.some((e: { kind: string }) => e.kind === "todo")).toBe(true);
		const mine = await page("/calendar?who=mine&include=events", member);
		expect(mine.props.entries.every((e: { kind: string }) => e.kind === "event")).toBe(true);
		const rem = await (await call("/calendar/reminders", { headers: json, cookie: member })).json();
		expect(rem.events[0].videoUrl).toBe("https://zoom.us/j/123");
		const token = new URL(cal.props.feedUrl).pathname.split("/").pop();
		const ics = await call(`/calendar/feed/${token}`);
		expect(ics.status).toBe(200);
		const text = await ics.text();
		expect(text).toContain("BEGIN:VCALENDAR");
		expect(text).toContain("SUMMARY:Design review");
		expect((await call("/calendar/feed/0000000000000000000000000000000000000000.ics")).status).toBe(404);
	});

	it("rejects events that end before they start", async () => {
		const res = await call(`/projects/${projectId}/schedule`, { method: "POST", headers: json, cookie: owner, body: { title: "Bad", startsAt: "2026-10-02T10:00:00.000Z", endsAt: "2026-10-01T10:00:00.000Z" } });
		expect(res.status).toBe(422);
	});
});

describe("chat & pings", () => {
	it("chats with polling", async () => {
		const said = await (await call(`/projects/${projectId}/chat/lines`, { method: "POST", headers: json, cookie: owner, body: { body: "Morning team" } })).json();
		const poll = await (await call(`/projects/${projectId}/chat/lines?after=0`, { headers: json, cookie: member })).json();
		expect(poll.lines.map((l: { body: string }) => l.body)).toContain("Morning team");
		const after = await (await call(`/projects/${projectId}/chat/lines?after=${said.line.id}`, { headers: json, cookie: member })).json();
		expect(after.lines.length).toBe(0);
	});

	it("pings privately and tracks unread", async () => {
		const start = await (await call("/pings", { method: "POST", headers: json, cookie: owner, body: { personIds: [memberId], body: "Got a sec?" } })).json();
		const again = await (await call("/pings", { method: "POST", headers: json, cookie: owner, body: { personIds: [memberId] } })).json();
		expect(again.id).toBe(start.id); // same pair → same conversation
		let counts = await (await call("/my/counts", { headers: json, cookie: member })).json();
		expect(counts.pingUnread).toBe(1);
		const t = await page(`/pings/${start.id}`, member);
		expect(t.props.thread.messages[0].body).toBe("Got a sec?");
		counts = await (await call("/my/counts", { headers: json, cookie: member })).json();
		expect(counts.pingUnread).toBe(0);
		expect((await call(`/pings/${start.id}`, { headers: xhr, cookie: client })).status).toBe(404);
	});
});

describe("check-ins & timesheet", () => {
	it("asks a question on schedule and collects answers", async () => {
		await post(`/projects/${projectId}/checkins`, owner, { question: "What did you work on today?", frequency: "daily", days: [], timeOfDay: "09:00" });
		const list = await page(`/projects/${projectId}/checkins`, owner);
		const q = list.props.questions[0];
		const { askDueQuestions } = await import("../src/server/services/checkins");
		const monday10 = new Date(2026, 8, 28, 10, 0);
		expect(askDueQuestions(monday10)).toBe(1);
		expect(askDueQuestions(monday10)).toBe(0); // once per day
		await post(`/projects/${projectId}/checkins/${q.id}/answers`, member, { body: "Logo kerning" });
		const show = await page(`/projects/${projectId}/checkins/${q.id}`, owner);
		expect(show.props.answers[0].body).toBe("Logo kerning");
	});

	it("logs time with friendly durations", async () => {
		await post(`/projects/${projectId}/timesheet`, owner, { date: "2026-09-20", duration: "1:30", description: "Review" });
		const sheet = await page(`/projects/${projectId}/timesheet?from=2026-09-01&to=2026-09-30`, owner);
		expect(sheet.props.entries[0].minutes).toBe(90);
		const bad = await call(`/projects/${projectId}/timesheet`, { method: "POST", headers: json, cookie: owner, body: { date: "2026-09-20", duration: "lots" } });
		expect(bad.status).toBe(422);
	});
});

describe("discovery: activity, search, everything, reports", () => {
	it("filters the activity timeline and builds a wrap-up", async () => {
		const t = await page(`/activity?project=${projectId}&person=${memberId}`, owner);
		expect(t.props.activities.length).toBeGreaterThan(0);
		expect(t.props.activities.every((a: { actor: { id: number } }) => a.actor.id === memberId)).toBe(true);
		const w = await page("/activity?view=wrapup", owner);
		expect(w.props.view).toBe("wrapup");
	});

	it("searches across projects and the jump menu, respecting access", async () => {
		const r = await (await call("/search/jump?q=kickoff", { headers: json, cookie: owner })).json();
		expect(r.results.some((x: { kind: string; title: string }) => x.kind === "message" && x.title === "Kickoff notes")).toBe(true);
		expect(r.recent.length).toBeGreaterThan(0);
		const outsider = await signUp("Nosy", "nosy@example.com");
		const none = await (await call("/search/jump?q=kickoff", { headers: json, cookie: outsider })).json();
		expect(none.results.length).toBe(0);
		const wild = await (await call("/search/jump?q=%25", { headers: json, cookie: owner })).json();
		expect(wild.results.length).toBe(0); // LIKE wildcards are escaped
	});

	it("lists everything by type and reports", async () => {
		const msgs = await page("/everything/messages", owner);
		expect(msgs.props.items[0].title).toBe("Kickoff notes");
		const files = await page("/everything/files?q=scope", owner);
		expect(files.props.items.map((i: { title: string }) => i.title)).toEqual(["Project Scope"]);
		const lineup = await page("/reports/lineup", owner);
		expect(lineup.props.projects[0].id).toBe(projectId);
		const plate = await page(`/reports/assignments?person=${memberId}`, owner);
		expect(plate.props.person.id).toBe(memberId);
	});
});

describe("bookmarks, notes, templates, archive, adminland, API", () => {
	it("bookmarks pages and keeps private notes", async () => {
		const b = await (await call("/my/bookmarks", { method: "POST", headers: json, cookie: owner, body: { url: `/projects/${projectId}`, title: "Logo Redesign", kind: "project" } })).json();
		expect(b.bookmarked).toBe(true);
		const list = await (await call("/my/bookmarks", { headers: json, cookie: owner })).json();
		expect(list.bookmarks[0].url).toBe(`/projects/${projectId}`);
		const bad = await call("/my/bookmarks", { method: "POST", headers: json, cookie: owner, body: { url: "https://evil.example", title: "x" } });
		expect(bad.status).toBe(422);
		await call("/my/notes", { method: "PUT", headers: json, cookie: owner, body: { body: "remember the milk" } });
		expect((await (await call("/my/notes", { headers: json, cookie: owner })).json()).body).toBe("remember the milk");
	});

	it("saves a template and creates a project from it", async () => {
		const res = await post(`/projects/${projectId}/template`, owner);
		const templateId = Number(new URL(res.headers.get("location") ?? "").pathname.split("/").pop());
		const created = await post("/projects", owner, { name: "Logo Redesign 2", templateId });
		const newId = Number(new URL(created.headers.get("location") ?? "").pathname.split("/").pop());
		const todos = await page(`/projects/${newId}/todos`, owner);
		expect(todos.props.lists.map((l: { name: string }) => l.name)).toContain("Launch");
		const docs = await page(`/projects/${newId}/docs`, owner);
		expect(docs.props.items.some((i: { title: string }) => i.title === "Project Scope")).toBe(true);
		const home = await page("/home", owner);
		expect(home.props.projects.some((p: { id: number }) => p.id === templateId)).toBe(false);
	});

	it("archives and restores", async () => {
		await post(`/projects/${projectId}/archive`, owner, { archived: true });
		let home = await page("/home", owner);
		expect(home.props.projects.some((p: { id: number }) => p.id === projectId)).toBe(false);
		const admin = await page("/adminland?tab=archived", owner);
		expect(admin.props.archived[0].id).toBe(projectId);
		await post(`/projects/${projectId}/archive`, owner, { archived: false });
		home = await page("/home", owner);
		expect(home.props.projects.some((p: { id: number }) => p.id === projectId)).toBe(true);
	});

	it("keeps at least one admin and blocks non-admins", async () => {
		const res = await call(`/adminland/people/${ownerId}`, { method: "PATCH", headers: json, cookie: owner, body: { role: "user" } });
		expect(res.status).toBe(422);
		expect((await call("/adminland", { headers: xhr, cookie: member })).status).toBe(302);
		await post("/adminland/account", owner, { name: "Enormicom" }, "PATCH");
		expect((await page("/home", member)).props.chrome.accountName).toBe("Enormicom");
	});

	it("serves the JSON API with personal tokens", async () => {
		const created = await (await call("/profile/tokens", { method: "POST", headers: json, cookie: member, body: { name: "CLI" } })).json();
		expect(created.token).toMatch(/^gm_/);
		expect((await call("/api/v1/projects")).status).toBe(401);
		const auth = { authorization: `Bearer ${created.token}` };
		const projects = await (await call("/api/v1/projects", { headers: auth })).json();
		expect(projects.projects.some((p: { id: number }) => p.id === projectId)).toBe(true);
		const made = await call(`/api/v1/projects/${projectId}/todos`, { method: "POST", headers: auth, body: { title: "From the API" } });
		expect(made.status).toBe(201);
		const todo = (await made.json()).todo;
		expect(todo.title).toBe("From the API");
		const done = await call(`/api/v1/projects/${projectId}/todos/${todo.id}/complete`, { method: "POST", headers: auth, body: {} });
		expect(done.status).toBe(200);
	});

	it("receives forwarded emails through the inbound webhook", async () => {
		const p = await page(`/projects/${projectId}`, owner);
		const token = p.props.project.inboundEmail.replace(/^project-/, "").split("@")[0];
		const res = await call(`/inbound/${token}`, { method: "POST", body: { from: "vendor@x.com", subject: "Invoice #42", text: "Attached." } });
		expect(res.status).toBe(201);
		const fw = await page("/everything/forwards", owner);
		expect(fw.props.items[0].title).toBe("Invoice #42");
		expect((await call("/inbound/ffffffffffffffffffffffff", { method: "POST", body: {} })).status).toBe(404);
	});
});

describe("markdown safety", () => {
	it("escapes HTML and only allows safe links/media", async () => {
		const { renderMarkdown } = await import("../src/shared/markdown");
		const html = renderMarkdown('<img src=x onerror=alert(1)> [x](javascript:alert(1)) ![a](https://evil/x.png) **ok** [y](https://ok.example)');
		expect(html).not.toContain("<img src=x");
		expect(html).toContain("&lt;img");
		expect(html).not.toContain('href="javascript');
		expect(html).not.toContain('src="https://evil');
		expect(html).toContain("<strong>ok</strong>");
		expect(html).toContain('href="https://ok.example"');
		expect(renderMarkdown("```js\nconst a = '<b>';\n```")).toContain("&lt;b&gt;");
	});
});

describe("multiple workspaces", () => {
	let acmeId = 0;
	let acmeProject = 0;

	it("creates a workspace, makes the creator its admin and switches into it", async () => {
		const res = await post("/workspaces", member, { name: "Acme Agency" });
		expect(res.status).toBe(303);
		const home = await page("/home", member);
		expect(home.props.chrome.accountName).toBe("Acme Agency");
		expect(home.props.isAdmin).toBe(true);
		expect(home.props.projects.length).toBe(0);
		acmeId = home.props.chrome.accountId;
		expect(home.props.chrome.workspaces.map((w: { name: string }) => w.name)).toContain("Enormicom");
		const made = await post("/projects", member, { name: "Acme Website" });
		acmeProject = Number(new URL(made.headers.get("location") ?? "").pathname.split("/").pop());
	});

	it("keeps projects, people and admin rights apart per workspace", async () => {
		// Owner is not in Acme: the project is invisible and switching is refused.
		expect((await call(`/projects/${acmeProject}`, { headers: xhr, cookie: owner })).status).toBe(404);
		expect((await post(`/workspaces/${acmeId}/switch`, owner)).status).toBe(404);
		// Back in the original workspace the member is not an admin and doesn't see Acme projects.
		await post("/workspaces/1/switch", member);
		const home = await page("/home", member);
		expect(home.props.isAdmin).toBe(false);
		expect(home.props.projects.some((p: { id: number }) => p.id === acmeProject)).toBe(false);
		expect((await call("/adminland", { headers: xhr, cookie: member })).status).toBe(302);
		// Invite-by-id can't pull someone in from another workspace.
		await post(`/projects/${acmeProject}/people`, member, { userIds: [ownerId] });
		await post(`/workspaces/${acmeId}/switch`, member);
		const people = await page(`/projects/${acmeProject}/people`, member);
		expect(people.props.project.people.some((p: { id: number }) => p.id === ownerId)).toBe(false);
		expect(people.props.everyone.some((p: { id: number }) => p.id === ownerId)).toBe(false);
	});

	it("follows links into another of your workspaces by switching automatically", async () => {
		await post("/workspaces/1/switch", member);
		const res = await call(`/projects/${acmeProject}`, { headers: xhr, cookie: member });
		expect(res.status).toBe(302);
		expect(new URL(res.headers.get("location") ?? "", BASE).pathname).toBe(`/projects/${acmeProject}`);
		const p = await page(`/projects/${acmeProject}`, member);
		expect(p.props.chrome.accountId).toBe(acmeId);
	});

	it("invites existing people into a workspace and scopes their notifications", async () => {
		const res = await call("/adminland/people", { method: "POST", headers: json, cookie: member, body: { name: "", email: "olivia@example.com", role: "member" } });
		expect(res.status).toBe(303);
		const ws = (await page("/home", owner)).props.chrome.workspaces;
		expect(ws.map((w: { name: string }) => w.name).sort()).toEqual(["Acme Agency", "Enormicom"]);
		const before = await (await call("/my/counts", { headers: json, cookie: owner })).json();
		await post(`/projects/${acmeProject}/people`, member, { userIds: [ownerId] });
		await post(`/projects/${acmeProject}/messages`, member, { title: "Acme kickoff", body: "Hello Acme" });
		// Owner is still looking at Enormicom: the Acme notification shows as a badge on that workspace only.
		const counts = await (await call("/my/counts", { headers: json, cookie: owner })).json();
		const feed = await (await call("/my/notifications", { headers: json, cookie: owner })).json();
		expect(feed.unread.some((n: { title: string }) => n.title.includes("Acme kickoff"))).toBe(false);
		const ows = (await page("/home", owner)).props.chrome.workspaces;
		expect(ows.find((w: { name: string }) => w.name === "Acme Agency").unread).toBeGreaterThan(0);
		expect(counts.unreadCount).toBe(before.unreadCount);
		// Search in Enormicom doesn't find Acme content.
		const r = await (await call("/search/jump?q=acme", { headers: json, cookie: owner })).json();
		expect(r.results.some((x: { title: string }) => x.title === "Acme kickoff")).toBe(false);
	});

	it("keeps pings inside a workspace", async () => {
		const outsider = await signUp("Pat Only-Enormicom", "pat@example.com");
		void outsider;
		const pat = (await page("/home", outsider)).props.auth.user.id;
		await post(`/workspaces/${acmeId}/switch`, member);
		const bad = await call("/pings", { method: "POST", headers: json, cookie: member, body: { personIds: [pat] } });
		expect(bad.status).toBe(422);
		const ok = await (await call("/pings", { method: "POST", headers: json, cookie: member, body: { personIds: [ownerId], body: "Acme ping" } })).json();
		const inEnormicom = await (await call("/pings/threads", { headers: json, cookie: owner })).json();
		expect(inEnormicom.threads.some((t: { id: number }) => t.id === ok.id)).toBe(false);
	});

	it("limits workspace clients to projects they're on", async () => {
		await post("/workspaces/1/switch", owner);
		const allAccess = await post("/projects", owner, { name: "Open to all", access: "all" });
		const openId = Number(new URL(allAccess.headers.get("location") ?? "").pathname.split("/").pop());
		await post(`/projects/${openId}`, owner, { name: "Open to all", description: "", icon: "", color: "blue", folderId: null, leadId: null, phase: "", status: "on_track", startOn: null, endOn: null, access: "all" }, "PATCH");
		await call("/adminland/people", { method: "POST", headers: json, cookie: owner, body: { name: "Carl Client", email: "carl@client.com", role: "client" } });
		const { findUserByEmail, updateUserPassword } = await import("../src/server/db");
		const { hashPassword } = await import("../src/server/auth");
		const carl = findUserByEmail.get("carl@client.com");
		updateUserPassword.run(await hashPassword("password123"), carl?.id ?? 0);
		const login = await call("/login", { method: "POST", headers: xhr, body: { email: "carl@client.com", password: "password123" } });
		const carlCookie = cookieOf(login);
		const home = await page("/home", carlCookie);
		expect(home.props.chrome.accountRole).toBe("client");
		expect(home.props.projects.some((p: { id: number }) => p.id === openId)).toBe(false);
		expect((await call("/projects", { method: "POST", headers: json, cookie: carlCookie, body: { name: "Nope" } })).status).toBe(403);
	});

	it("scopes API tokens to the workspace they were made in", async () => {
		await post(`/workspaces/${acmeId}/switch`, member);
		const created = await (await call("/profile/tokens", { method: "POST", headers: json, cookie: member, body: { name: "Acme CLI" } })).json();
		const list = await (await call("/api/v1/projects", { headers: { authorization: `Bearer ${created.token}` } })).json();
		expect(list.projects.map((p: { id: number }) => p.id)).toEqual([acmeProject]);
	});
});
