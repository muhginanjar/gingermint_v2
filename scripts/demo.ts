/**
 * `bun run db:demo` — seed a realistic demo account ("Enormicom") through the
 * real services, so activity, notifications, previews and search all work.
 * Everyone's password is `password123`. Sign in as chad@enormicom.test (admin).
 * Idempotent: does nothing if the demo admin already exists.
 */
import { hashPassword } from "../src/server/auth";
import { createUserWithRole, findUserByEmail } from "../src/server/db";
import { updateAccount } from "../src/server/queries/accounts";
import * as accounts from "../src/server/services/accounts";
import { updatePersonTitle } from "../src/server/queries/people";
import * as cards from "../src/server/services/cards";
import * as chat from "../src/server/services/chat";
import * as checkins from "../src/server/services/checkins";
import { addComment, toggleReaction } from "../src/server/services/comments";
import * as messages from "../src/server/services/messages";
import * as pings from "../src/server/services/pings";
import * as projects from "../src/server/services/projects";
import * as schedule from "../src/server/services/schedule";
import * as timesheet from "../src/server/services/timesheet";
import * as todos from "../src/server/services/todos";
import * as vault from "../src/server/services/vault";
import type { User } from "../src/shared/types";

const ADMIN = "chad@enormicom.test";
if (findUserByEmail.get(ADMIN)) {
	console.log(`Demo already seeded — sign in as ${ADMIN} / password123`);
	process.exit(0);
}

const hash = await hashPassword("password123");
const PEOPLE: [string, string, string][] = [
	["Chad Nakamura", "chad", "Founder"],
	["Liza Randall", "liza", "Design Director"],
	["Janet Montgomery", "janet", "People Ops"],
	["Geoff Collier", "geoff", "Senior Designer"],
	["Sofia Castillo Rivera", "sofia", "Account Lead"],
	["Kurt Holloway", "kurt", "Marketing"],
	["Luna Rodriguez", "luna", "Finance"],
	["Leah Bernstein", "leah", "Support Lead"],
	["Daniel Young", "daniel", "QA Engineer"],
	["Chris Sato", "chris", "Engineer"],
	["Melissa Vance", "melissa", "Designer"],
	["Christina Moore", "christina", "Producer"],
];
const u: Record<string, User> = {};
for (const [name, handle, title] of PEOPLE) {
	const row = createUserWithRole.get(name, `${handle}@enormicom.test`, hash, handle === "chad" ? "admin" : "user");
	if (!row) throw new Error("seed failed");
	updatePersonTitle.run(title, row.id);
	const role = handle === "chad" ? "admin" : "member";
	accounts.ensureMember(1, row.id, role);
	const full = findUserByEmail.get(`${handle}@enormicom.test`);
	if (full) u[handle] = accounts.asAccountUser(full, 1, role);
}
const P = (h: string) => {
	const x = u[h];
	if (!x) throw new Error(h);
	return x;
};
const ids = (...hs: string[]) => hs.map((h) => P(h).id);
updateAccount.run("Enormicom", null, 1);

const day = (offset: number) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const at = (offset: number, h: number, m = 0) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	d.setHours(h, m, 0, 0);
	return d.toISOString();
};

const chad = P("chad");
const marketingFolder = projects.createFolder(chad, "Marketing Projects", "pink");
const aiFolder = projects.createFolder(chad, "AI Agent Projects", "purple");

async function project(owner: User, name: string, description: string, icon: string, color: string, members: string[], extra: Partial<projects.ProjectInput> = {}) {
	const id = projects.createProject(owner, { name, description, icon, color, folderId: extra.folderId ?? null });
	await projects.invite(owner, id, { userIds: ids(...members), emails: [], role: "member" });
	projects.updateProjectSettings(owner, id, {
		name, description, icon, color, folderId: extra.folderId ?? null, leadId: extra.leadId ?? null,
		phase: extra.phase ?? "", status: extra.status ?? "on_track", startOn: extra.startOn ?? null, endOn: extra.endOn ?? null,
		access: extra.access ?? "invite",
	});
	return id;
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const hq = await project(chad, "Enormicom HQ", "Company-wide announcements and everything everyone needs.", "🏢", "blue",
	["liza", "janet", "geoff", "sofia", "kurt", "luna", "leah", "daniel", "chris", "melissa", "christina"], { access: "all" });
const support = await project(chad, "Customer Support", "Human 🤝 Friendly ❤️ Timely ⏳ Support", "", "teal", ["leah", "daniel", "chris"], { access: "all" });
const logo = await project(P("liza"), "GH Designs: Logo Redesign", "GH Designs: Lead: Sofia | Phase 2", "🎨", "orange",
	["chad", "geoff", "sofia", "kurt", "melissa"], { leadId: P("sofia").id, phase: "Phase 2", startOn: day(-20), endOn: day(25) });
const website = await project(chad, "Website Redesign Project", "Nine to Thrive", "🧭", "green",
	["liza", "geoff", "chris", "daniel", "melissa", "kurt", "leah"], { phase: "Build", status: "at_risk", startOn: day(-45), endOn: day(40), leadId: P("chris").id });
const campaign = await project(P("kurt"), "Marketing Campaign", "GH Designs", "📣", "pink",
	["chad", "christina", "geoff", "melissa", "liza", "sofia"], { folderId: marketingFolder, startOn: day(-10), endOn: day(50), phase: "Pre-production" });
const accounting = await project(P("luna"), "Accounting Team", "We know where the 💰 is at!", "", "yellow", ["chad", "janet"], { access: "all" });
const hipdrip = await project(P("kurt"), "Marketing Campaign - Hip Drip Clothing", "Marketing tracking project for Hip Drip 💧", "🧢", "purple",
	["christina", "melissa"], { startOn: day(5), endOn: day(70) });
const swag = await project(P("janet"), "Company $wag", "Hats, shirts and stickers for the team.", "🧢", "yellow", ["kurt", "chad"], { folderId: marketingFolder });
const agents = await project(chad, "AI Testing Ground", "Where we try agent workflows against the API.", "🧪", "gray", ["chris", "daniel"], { folderId: aiFolder });
await project(chad, "Basecamp Agent Use", "Learn and practice using agents with the JSON API + tokens.", "🤖", "teal", ["chris"], { folderId: aiFolder });
await project(P("chris"), "Cycle 2: New Features", "OTP login, search pagination, and the new onboarding.", "🚀", "blue", ["daniel", "chad", "leah"], { startOn: day(-30), endOn: day(10), phase: "Cycle 2" });
projects.toggleStar(chad, logo, true);
projects.toggleStar(chad, hq, true);

// Client on the logo project (Client Mode)
const clientRow = createUserWithRole.get("Gwen Harper (GH Designs)", "gwen@ghdesigns.test", hash, "user");
if (clientRow) {
	updatePersonTitle.run("Client · GH Designs", clientRow.id);
	await projects.invite(P("liza"), logo, { userIds: [], emails: ["gwen@ghdesigns.test"], role: "client" });
}

// ---------------------------------------------------------------------------
// Message Boards
// ---------------------------------------------------------------------------
const chapter = messages.create(P("liza"), hq, {
	title: "A new chapter for Enormicom — what's changing, what's not, and what comes next",
	body: "I've been sitting on this message for a few weeks, waiting until we had enough locked down to say something worth saying. We're not all the way there, but we're close enough that I'd rather tell you now.\n\n## What's changing\n- We're consolidating client work into **three studios**\n- Every project gets a lead and a phase on its project page\n\n## What's not\n- How we treat clients\n- Four-day summer weeks 🌞\n\n> Questions are welcome — reply right here.",
	category: "Announcement", clientVisible: false,
});
messages.create(P("liza"), website, { title: "Cycle 2 — wrap-up note", body: "Big week. Two features shipped to GA and the third is wrapping QA. Thank you to everyone who pushed through the last sprint — I know the search-pagination work was thornier than it looked.", category: "Heartbeat", clientVisible: false });
messages.create(P("janet"), hq, { title: "Q3 onboarding window opens 6/1", body: "Heads up — new-hire cohort for Q3 starts onboarding the first week of June. Three roles confirmed, two pending offer. Hiring managers: please get your role-specific Day 1 docs into the **Admin Files** folder by Friday.", category: "FYI", clientVisible: false });
messages.create(P("kurt"), swag, { title: "Q2 swag budget reconciliation", body: "We came in **$340 under** on hats. Proposing we roll that into stickers.\n\n| Item | Budget | Actual |\n|---|---|---|\n| Hats | $1,200 | $860 |\n| Shirts | $2,000 | $1,990 |", category: "", clientVisible: false });
const logoMsg = messages.create(P("sofia"), logo, { title: "Direction check before the client call", body: `Let's keep **#1 as the leading direction** unless something dramatic changes by Friday. @[Geoff Collier](mention:${P("geoff").id}) can you prep the dark-background previews?`, category: "Pitch", clientVisible: true });
addComment(P("geoff"), "message", logoMsg, "On it — dark previews by tomorrow, plus favicon sizes.");
addComment(P("melissa"), "message", logoMsg, "Great catch — favicon legibility at 16px is always the gotcha. Happy to eyeball the small sizes once they are cut.");
addComment(P("chad"), "message", chapter, "Thanks Liza. This is the right move.");
toggleReaction(P("chad"), "message", chapter, "🎉");
toggleReaction(P("kurt"), "message", chapter, "🎉");
toggleReaction(P("janet"), "message", chapter, "❤️");

// ---------------------------------------------------------------------------
// To-dos
// ---------------------------------------------------------------------------
const logoList = todos.createList(P("liza"), logo, { name: "Logo Design #1", description: "Primary direction", clientVisible: true });
const deliverList = todos.createList(P("liza"), logo, { name: "Delivery & handoff", description: "", clientVisible: false });
const sketch = todos.createTodo(P("liza"), logo, { listId: logoList, parentId: null }, { title: "Explore the mark", notes: "Push the ligature idea further.", dueOn: day(3), assigneeIds: ids("geoff"), notifyIds: ids("sofia") });
for (const [title, done] of [["Sketch 8-10 rough directions", true], ["Refine top 3-4 into cleaner mocks", true], ["Test variations at different sizes", false]] as const) {
	const s = todos.createTodo(P("liza"), logo, { listId: null, parentId: sketch }, { title, notes: "", dueOn: null, assigneeIds: ids("geoff"), notifyIds: [] });
	if (done) todos.toggleTodo(P("geoff"), logo, s, true);
}
todos.createTodo(P("sofia"), logo, { listId: logoList, parentId: null }, { title: "Client preview on dark + photo backgrounds", notes: "", dueOn: day(1), assigneeIds: ids("geoff", "melissa"), notifyIds: [] });
todos.createTodo(P("sofia"), logo, { listId: deliverList, parentId: null }, { title: "Decide on the final file delivery pack", notes: "", dueOn: day(8), assigneeIds: ids("liza"), notifyIds: [] });
const late = todos.createTodo(P("sofia"), logo, { listId: deliverList, parentId: null }, { title: "Revised contract signed", notes: "", dueOn: day(-2), assigneeIds: ids("sofia"), notifyIds: [] });
void late;
todos.createTodo(P("liza"), logo, { listId: null, parentId: null }, { title: "Single-color variant for embroidery + merch", notes: "", dueOn: null, assigneeIds: [], notifyIds: [] });
todos.trackOnHill(P("liza"), logo, logoList, true);
todos.moveOnHill(P("liza"), logo, logoList, 62);
todos.trackOnHill(P("liza"), logo, deliverList, true);
todos.moveOnHill(P("liza"), logo, deliverList, 25);

const qa = todos.createList(P("chris"), website, { name: "QA", description: "", clientVisible: false });
todos.createTodo(P("chris"), website, { listId: qa, parentId: null }, { title: "Write test cases for the new OTP login flow", notes: "", dueOn: day(2), assigneeIds: ids("daniel"), notifyIds: [] });
todos.createTodo(P("daniel"), website, { listId: qa, parentId: null }, { title: "Add regression tests for the OTP login timeout", notes: "", dueOn: day(0), assigneeIds: ids("daniel"), notifyIds: [] });
const launch = todos.createList(P("chris"), website, { name: "Launch checklist", description: "", clientVisible: false });
const faq = todos.createTodo(P("leah"), website, { listId: launch, parentId: null }, { title: "Write the launch-day FAQ for the support team", notes: "", dueOn: day(-1), assigneeIds: ids("leah"), notifyIds: [] });
todos.toggleTodo(P("leah"), website, faq, true);
todos.createTodo(P("chris"), website, { listId: launch, parentId: null }, { title: "Accessibility audit on the new palette — verify WCAG AA contrast on every state", notes: "", dueOn: day(4), assigneeIds: ids("geoff"), notifyIds: [] });
const bug = todos.createList(P("leah"), support, { name: "Bugs from clients", description: "", clientVisible: false });
const fix = todos.createTodo(P("leah"), support, { listId: bug, parentId: null }, { title: "Fix bug that prevents clients from commenting", notes: "", dueOn: day(-1), assigneeIds: ids("chris"), notifyIds: ids("leah") });
todos.toggleTodo(P("chris"), support, fix, true);
const acct = todos.createList(P("luna"), accounting, { name: "Month-end", description: "", clientVisible: false });
const check = todos.createTodo(P("luna"), accounting, { listId: acct, parentId: null }, { title: "Return erroneous check", notes: "", dueOn: day(-3), assigneeIds: ids("luna"), notifyIds: [] });
todos.toggleTodo(P("luna"), accounting, check, true);
todos.createTodo(P("luna"), accounting, { listId: acct, parentId: null }, { title: "Q2 marketing budget — pacing check", notes: "", dueOn: day(6), assigneeIds: ids("luna", "kurt"), notifyIds: [] });
const shoot = todos.createList(P("christina"), campaign, { name: "Shoot prep", description: "", clientVisible: false });
todos.createTodo(P("christina"), campaign, { listId: shoot, parentId: null }, { title: "Create storyboards and shot list", notes: "", dueOn: day(5), assigneeIds: ids("geoff"), notifyIds: [] });
todos.createTodo(P("christina"), campaign, { listId: shoot, parentId: null }, { title: "Researching a venue", notes: "", dueOn: day(9), assigneeIds: ids("christina"), notifyIds: [] });
todos.createTodo(P("kurt"), campaign, { listId: shoot, parentId: null }, { title: "Develop creative brief and concept treatment", notes: "", dueOn: day(2), assigneeIds: ids("melissa"), notifyIds: [] });
todos.createTodo(P("kurt"), campaign, { listId: null, parentId: null }, { title: "Edit cutdowns for social", notes: "", dueOn: day(12), assigneeIds: ids("kurt"), notifyIds: [] });

// ---------------------------------------------------------------------------
// Card Table (logo project) — Triage, Idea Stage, Drafting, Review, Client Approval
// ---------------------------------------------------------------------------
const table = cards.table(P("liza"), logo).columns;
const col = (name: string) => table.find((c) => c.name === name)?.id ?? 0;
const inProgress = col("In progress");
cards.editColumn(P("liza"), logo, inProgress, "Drafting", "orange");
cards.addColumn(P("liza"), logo, "Client Approval", "blue");
const fresh = cards.table(P("liza"), logo).columns;
const idCol = (name: string) => fresh.find((c) => c.name === name)?.id ?? 0;
cards.addColumn(P("liza"), logo, "Idea Stage", "purple");
const idea = cards.table(P("liza"), logo).columns.find((c) => c.name === "Idea Stage")?.id ?? 0;
cards.reorderColumns(P("liza"), logo, [idea, idCol("Drafting"), idCol("Review"), idCol("Client Approval")]);
const card = (column: number, title: string, who: string[], due: string | null = null) =>
	cards.createCard(P("liza"), logo, column, { title, body: "", dueOn: due, assigneeIds: ids(...who) });
card(idCol("Triage"), "Client wants to preview logo on dark + photo backgrounds", ["geoff"]);
card(idCol("Triage"), "Decide on the final file delivery pack for handoff", []);
card(idCol("Triage"), "Single-color variant for embroidery + merch", ["geoff"]);
card(idCol("Triage"), "Splash Page", []);
card(idea, "Logo Design #2", ["geoff"]);
card(idCol("Drafting"), "Monogram exploration", ["melissa"]);
card(idCol("Drafting"), "Wordmark kerning pass", ["geoff"]);
const d1 = card(idCol("Review"), "Logo Design #1", ["geoff"]);
const alt = card(idCol("Review"), "Alternate Logo Designs", ["geoff"], day(4));
for (const s of ["Three alternates", "Mono versions", "Favicon crops"]) cards.addStep(P("geoff"), logo, alt, { title: s, assigneeId: P("geoff").id, dueOn: null });
for (const st of cards.showCard(P("geoff"), logo, alt).card.steps) cards.toggleStep(P("geoff"), logo, st.id, true);
card(idCol("Client Approval"), "Revised Contract", ["sofia"], day(3));
card(idCol("Done"), "Brand audit", ["liza"]);
card(idCol("Done"), "Competitor moodboard", ["melissa"]);
card(idCol("Not now"), "Animated logo", []);
addComment(P("geoff"), "card", d1, "Kerning fixes are in. Working on photo background previews for the client preview now.");

// ---------------------------------------------------------------------------
// Docs & Files
// ---------------------------------------------------------------------------
const folder = (title: string, color: string, clientVisible = false, parentId: number | null = null) =>
	vault.createItem(P("liza"), logo, { kind: "folder", parentId, title, body: "", color, url: null, description: "", imageUrl: null, attachmentId: null, clientVisible });
const insp = folder("✨ Inspiration", "pink");
const admin = folder("Admin Files", "green");
const drafts = folder("Drafts", "orange");
const finals = folder("Final Designs", "blue", true);
vault.createItem(P("liza"), logo, {
	kind: "doc", parentId: null, title: "Project Scope", color: "blue", url: null, description: "", imageUrl: null, attachmentId: null, clientVisible: true,
	body: "## Description of Work\nA refreshed identity for GH Designs: primary mark, wordmark, and a small system.\n\n## Deliverables\n- Primary logo (color, mono, reversed)\n- Favicon + app icon\n- One-page usage guide\n\n## Design Process\n1. Discovery\n2. Exploration (8–10 directions)\n3. Refinement\n4. Delivery\n\n## Timeline, Milestones & Deadlines\n| Milestone | Date |\n|---|---|\n| Directions review | Week 2 |\n| Client approval | Week 4 |\n| Final files | Week 6 |\n\n```css\n:root { --gh-orange: #e4572e; }\n```",
});
vault.createItem(P("liza"), logo, { kind: "link", parentId: insp, title: "Logo explorations (Figma)", body: "", color: "blue", url: "https://www.figma.com/file/gh-logo", description: "All directions, frames per round.", imageUrl: null, attachmentId: null, clientVisible: false });
vault.createItem(P("liza"), logo, { kind: "link", parentId: admin, title: "Signed SOW (Google Docs)", body: "", color: "blue", url: "https://docs.google.com/document/d/sow", description: "", imageUrl: null, attachmentId: null, clientVisible: false });
vault.createItem(P("liza"), logo, { kind: "link", parentId: finals, title: "Final files (Dropbox)", body: "", color: "blue", url: "https://www.dropbox.com/sh/final", description: "Everything the client needs.", imageUrl: null, attachmentId: null, clientVisible: true });
for (const t of ["Contract v2", "Brand questionnaire"]) vault.createItem(P("sofia"), logo, { kind: "doc", parentId: admin, title: t, body: `# ${t}\n\nDraft.`, color: "blue", url: null, description: "", imageUrl: null, attachmentId: null, clientVisible: false });
for (const t of ["Round 1 notes", "Round 2 notes", "Type pairings"]) vault.createItem(P("geoff"), logo, { kind: "doc", parentId: drafts, title: t, body: "Notes…", color: "blue", url: null, description: "", imageUrl: null, attachmentId: null, clientVisible: false });
void insp;

// ---------------------------------------------------------------------------
// Chat, pings, schedule, check-ins, timesheet
// ---------------------------------------------------------------------------
const lines: [string, string][] = [
	["geoff", "Quick status: Logo Design #1 is in Review with the kerning fixes. Working on the photo background previews for the client preview now."],
	["liza", "Nice — those thumbnails are looking strong. How's #2 coming along?"],
	["sofia", "Moved #2 back into Drafting this morning — the icon gets fuzzy under 32px so I'm thinning the inner stroke. Should be back in Review tomorrow."],
	["geoff", "Let's keep #1 as the leading direction unless something dramatic changes by Friday."],
	["liza", "Agreed. I'll start prepping the client deck around #1 and keep #2 as the named backup."],
	["sofia", "Sounds good. I'll have the dimensions doc updated for both directions just in case the client wants to compare side-by-side on the call."],
];
for (const [who, text] of lines) chat.say(P(who), logo, text, null);
chat.say(P("chris"), hq, "Deploy is green ✅", null);
chat.say(P("janet"), hq, "Pizza on Friday — reply with your topping 🍕", null);

const ping1 = pings.start(P("sofia"), ids("chad"));
pings.send(P("sofia"), ping1, "Ok here's a draft - lemme know if this is what you're thinking.", null);
pings.send(P("chad"), ping1, "How's that draft coming along?", null);
const ping2 = pings.start(P("geoff"), ids("chad"));
pings.send(P("geoff"), ping2, "Got 5 minutes after lunch?", null);

schedule.createEvent(P("sofia"), logo, { title: "Client review: directions", notes: "Walk through #1 and #2.", startsAt: at(1, 14), endsAt: at(1, 15), allDay: false, videoUrl: "https://zoom.us/j/555000111", location: "", clientVisible: true, participantIds: ids("chad", "liza", "geoff", "sofia") });
schedule.createEvent(P("janet"), hq, { title: "All-hands", notes: "", startsAt: at(3, 10), endsAt: at(3, 11), allDay: false, videoUrl: "https://meet.google.com/abc-defg-hij", location: "Big room", clientVisible: false, participantIds: [] });
schedule.createEvent(P("chris"), website, { title: "3rd Interview with Rachel", notes: "", startsAt: at(2, 16), endsAt: at(2, 17), allDay: false, videoUrl: "", location: "", clientVisible: false, participantIds: ids("chad", "chris") });
schedule.createEvent(P("kurt"), campaign, { title: "Photo shoot", notes: "", startsAt: day(9), endsAt: day(10), allDay: true, videoUrl: "", location: "Studio B", clientVisible: false, participantIds: ids("christina", "geoff", "melissa") });
schedule.createEvent(P("chad"), hq, { title: "Stand-up", notes: "", startsAt: new Date(Date.now() + 12 * 60_000).toISOString(), endsAt: new Date(Date.now() + 27 * 60_000).toISOString(), allDay: false, videoUrl: "https://zoom.us/j/999", location: "", clientVisible: false, participantIds: ids("chad", "chris", "liza") });

projects.addTool(chad, hq, "checkins");
const q = checkins.createQuestion(chad, hq, { question: "What did you work on today?", frequency: "daily", days: [], timeOfDay: "16:00", paused: false });
checkins.createQuestion(chad, hq, { question: "What's on your plate this week?", frequency: "weekly", days: [1], timeOfDay: "09:00", paused: false });
checkins.askDueQuestions(new Date());
checkins.answer(P("liza"), hq, q, "Client deck for GH Designs, plus a pass on the new palette.");
checkins.answer(P("chris"), hq, q, "OTP login timeouts — tests are green. Starting on search pagination.");

projects.addTool(P("liza"), logo, "timesheet");
timesheet.logTime(P("geoff"), logo, { date: day(-1), duration: "3:15", description: "Kerning + previews", todoId: sketch, personId: null });
timesheet.logTime(P("liza"), logo, { date: day(-2), duration: "1.5", description: "Client deck", todoId: null, personId: null });
timesheet.logTime(P("melissa"), logo, { date: day(0), duration: "45m", description: "Favicon sizes", todoId: null, personId: null });
void agents;
void hipdrip;
void support;

// ---------------------------------------------------------------------------
// A second workspace: Liza's own studio, shared with Chad and Geoff.
// ---------------------------------------------------------------------------
const studio = accounts.createWorkspace(P("liza"), "GH Designs Studio");
accounts.ensureMember(studio, P("chad").id, "member");
accounts.ensureMember(studio, P("geoff").id, "member");
const lizaRow = findUserByEmail.get("liza@enormicom.test");
const lizaStudio = lizaRow ? accounts.asAccountUser(lizaRow, studio, "admin") : null;
if (lizaStudio) {
	const internal = projects.createProject(lizaStudio, { name: "Studio Ops", description: "Invoices, gear, and the studio calendar.", icon: "🛠️", color: "teal" });
	await projects.invite(lizaStudio, internal, { userIds: ids("chad", "geoff"), emails: [], role: "member" });
	messages.create(lizaStudio, internal, { title: "Welcome to the studio workspace", body: "This lives apart from Enormicom — switch workspaces from the Jump menu (Shift+J).", category: "Announcement", clientVisible: false });
	const list = todos.createList(lizaStudio, internal, { name: "This month", description: "", clientVisible: false });
	todos.createTodo(lizaStudio, internal, { listId: list, parentId: null }, { title: "Renew the font licenses", notes: "", dueOn: day(4), assigneeIds: ids("geoff"), notifyIds: [] });
}

console.log(`Demo account seeded. Sign in as ${ADMIN} / password123 (admin), or any *@enormicom.test user. Client: gwen@ghdesigns.test. Liza, Chad and Geoff also belong to the "GH Designs Studio" workspace.`);
process.exit(0);
