# GingerMint v2

Basecamp‑5‑style project collaboration — Home dashboard, Jump menu, New for You,
Bubble Up, My Bar, Message Board, To‑dos (loose to‑dos, subtasks, Hill Charts),
Card Table, Docs & Files, Schedule & global Calendar, Chat, Pings, voice notes,
Automatic Check‑ins, Timesheet, Activity & Wrap‑up, Everything, Reports & the
Lineup, Client Mode, templates, API tokens, webhooks and email‑in.

Built on **[Dulak](https://dulak.pages.dev)** — Bun · Hono · **bun:sqlite (WAL)** ·
Inertia v3 · Svelte 5 · Tailwind v4 — with **shadcn/ui** design tokens and
components, and the routes → handlers → services → queries layering from the
original gingermint (Go) app.

## Quick start

```bash
bun install
cp .env.example .env          # defaults work for local development
bun run db:demo               # optional: seed the "Enormicom" demo account
bun run dev                   # http://localhost:4000
```

Demo sign‑ins (password `password123`):

| Who | Email | Sees |
|---|---|---|
| Admin | `chad@enormicom.test` | Everything, Adminland |
| Member | `liza@enormicom.test`, `geoff@…`, `sofia@…` … | Their projects + All‑access projects |
| Client | `gwen@ghdesigns.test` | Only what's marked “The client sees this” in *GH Designs: Logo Redesign* |

Liza, Chad and Geoff also belong to a second workspace, **GH Designs Studio** —
switch from the Jump menu (Shift+J) or `/workspaces`.

Without the demo, the **first person to register becomes the admin** of the
first workspace; later sign-ups join it as members.

## Workspaces

One installation hosts many workspaces. Each has its own projects, folders,
people and roles (admin / member / client), pings, notifications, bookmarks,
Adminland settings and API tokens. Anyone can start a new workspace at
`/workspaces` (they become its admin) and invite people from Adminland —
existing users are simply added. Unread counts from other workspaces show on
the switcher, and links into another of your workspaces switch automatically.

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server with watch + live client rebuilds |
| `bun run build` | Regenerate the page registry and build client + SSR bundles into `dist/` |
| `bun run start` | Production server (`NODE_ENV=production`) |
| `bun run test` | E2E suites (in‑memory SQLite, `bun test --isolate`) |
| `bun run typecheck` | `svelte-check` over Svelte + TypeScript |
| `bun run pages` | Regenerate `src/client/pages.ts` after adding a page |
| `bun run db:demo` | Seed the demo account (idempotent) |
| `bun run db:seed [email] [password] [role]` | Create a single user |

The SQLite database lives at `DATABASE_PATH` (default `./data/app.sqlite`) in
WAL mode; migrations in `migrations/` run automatically at startup.

## Changing the port

The server listens on `PORT` (default `4000`). Bun loads `.env` from the
working directory, so set it there — and keep `APP_URL` in step, since it is
used for email links and OAuth redirects:

```env
PORT=8080
APP_URL=http://localhost:8080      # or your public URL, e.g. https://gingermint.example.com
```

Or for a single run: `PORT=8080 bun run start`.

In development a busy port is skipped automatically (4000 → 4001 …). In
production (`NODE_ENV=production`) it is not — the server fails to start
instead, so pick a free port. If you use Google sign‑in, the redirect URI in
Google Console must match `APP_URL` (`<APP_URL>/auth/google/callback`).

## Production with PM2

`ecosystem.config.cjs` runs the app under PM2 with Bun as the interpreter:

```bash
bun install
cp .env.example .env               # set NODE_ENV=production, PORT, APP_URL, mail, secrets
bun run build                      # client + SSR bundles into dist/
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup            # restart on server reboot (run the command it prints)
```

Everyday commands: `pm2 logs gingermintv2`, `pm2 restart gingermintv2`,
`pm2 status`. If `bun` is not on PM2's `PATH`, set `interpreter` in
`ecosystem.config.cjs` to the full path (`which bun`, e.g. `~/.bun/bin/bun`).

> **Run one instance only** (fork mode, `instances: 1`). SQLite is a
> single‑writer database and the Automatic Check‑ins scheduler runs
> in‑process — cluster mode would send duplicate check‑in prompts.

Put secrets in `.env`, not in `ecosystem.config.cjs` — values in its `env`
block override `.env` and the file is committed.

### Deploying updates — `deploy.sh`

On the server, from the project root:

```bash
./deploy.sh
```

It runs these steps and stops on the first failure:

1. **Backup** the SQLite database (`VACUUM INTO`, safe while the app is
   running in WAL mode) to `$BACKUP_DIR` (default `~/gingermint/data/backup`).
2. **Upload** the backup to Wasabi/S3 — optional; only when `WASABI_BUCKET`,
   `WASABI_ACCESS_KEY`, `WASABI_SECRET_KEY` (and optionally `WASABI_REGION`,
   `WASABI_ENDPOINT`) are set in `.env` and the `aws` CLI is installed.
3. **`git pull`** — uncommitted local changes are stashed first, never
   discarded. Exits early when there is nothing new.
4. **`bun install`**, only when `package.json`/`bun.lock` changed or
   `node_modules` is missing.
5. **`bun run build`**.
6. **`pm2 restart gingermintv2`** (or `pm2 start ecosystem.config.cjs` on the
   first deploy). Migrations apply on startup.
7. **Health check** on `http://localhost:$PORT/health`.

Uploaded files in `data/uploads/` are not part of the backup — back that
directory up separately.

## Feature map (Basecamp 5 document → where it lives)

| Document section | In GingerMint |
|---|---|
| Home screen (greeting, new project, folders, invite, Adminland, project cards, recent activity, active people) | `/home` |
| Universal navigation / Jump (Shift+J, ⌘K), Activity · Calendar · Reports · Everything tiles, recently visited | Top‑bar account button, Jump menu |
| Pings + New for You (sidebar, mark all read) | Bell / “New for you” pill, `/pings` |
| Bubble Up (later today, tomorrow, weekend, next week, a date) | Any notification, and the Bubble up button on every record |
| Chat + voice notes, emoji boosts, media preview before sending | `/projects/:id/chat`, Pings |
| My Bar: My Tasks, My Events, Due Today, My Bookmarks, My Notes (Shift+1…5) | Bottom bar on every page |
| Search + live filtering | Jump menu, `/search`, filter boxes on every list |
| Project page: icon/logo, lead, phase, dates, status, latest activity, toolbox previews | `/projects/:id` |
| Card Table: Triage, stages, on hold, Not now, Done, steps | `/projects/:id/cards` |
| Docs & Files: All/Images/Docs, file type, sort, filter, keep folders open, colored folders, client visibility, cloud links, multi‑select | `/projects/:id/docs` |
| Document editor: headings, lists, links, tables, Markdown, code blocks, sticky Save | Document editor + the shared rich‑text editor |
| To‑dos: lists, loose to‑dos, view as, filter, hide completed lists, subtasks with assignee/due, when‑done notify | `/projects/:id/todos` |
| Hill Charts | To‑dos → list ··· → “Track on the hill chart” |
| Latest Activity: Timeline + Wrap‑up, filter by project/person | `/activity` |
| Global calendar: next 6 weeks / month, All projects / Mine / Everyone, Events or Events + tasks, subscribe | `/calendar` (+ private ICS feed) |
| Everything: messages, docs & files, comments, check‑ins, forwarded emails | `/everything/*` |
| Upcoming event reminder + Join Zoom/Meet/Teams | Pop‑up ~15 minutes before your events |
| Add a tool / project customization | “Add a tool” card; rename, remove, drag to reorder |
| External links (Figma, Google Docs, Dropbox…) | Docs & Files → New… → Link |
| Automatic Check‑ins | `/projects/:id/checkins` (in‑process scheduler) |
| Reports, the Lineup | `/reports/*` |
| Client Mode | Invite as *client*; mark items “The client sees this” |
| Time tracking | Timesheet tool + `/reports/timesheet` |
| Project templates | Save as template / Adminland → Templates |
| Invitations from a project | `/projects/:id/people` (existing people or new emails) |
| API / CLI / AI agent access | Profile → API tokens, `GET /api/v1/*` |
| Third‑party integrations | Per‑project webhooks + inbound email (`POST /inbound/:token`) |
| Keyboard shortcuts, hold Shift for keycaps | `?` for the cheat sheet |
| Mobile | Responsive layouts; My Bar + bell stay reachable on phones |
| Revamped colors, sticky Edit/Save | 9‑color palette everywhere; sticky save bar in editors |

## JSON API

Create a token on **Profile → API tokens**, then:

```bash
curl -H "Authorization: Bearer gm_…" http://localhost:4000/api/v1/projects
curl -H "Authorization: Bearer gm_…" -H "content-type: application/json" \
     -d '{"title":"Ship it","assigneeIds":[2]}' \
     http://localhost:4000/api/v1/projects/1/todos
```

Endpoints: `GET /me`, `GET /projects`, `GET /projects/:id`,
`GET|POST /projects/:id/todos`, `POST /projects/:id/todos/:todoId/complete`,
`GET|POST /projects/:id/messages`, `POST /comments {type,id,body}`,
`GET /activity`, `GET /search?q=`, `GET /assignments`. Tokens carry the
creator's permissions.

## Structure

```
src/
├── index.ts                 entry: build assets (dev), check-in scheduler, Bun.serve
├── server/
│   ├── app.ts               middleware, error mapping, route mounting
│   ├── db.ts                SQLite connection (WAL) + boilerplate auth statements
│   ├── routes/              URL → guard → handler (one file per namespace)
│   ├── handlers/            parse input, call services, render / redirect / JSON
│   ├── services/            business logic, access control, notifications, activity
│   └── queries/             prepared SQL — the only place SQL lives
├── client/
│   ├── pages/               Inertia pages (home, projects, messages, todos, cards, docs, …)
│   ├── components/          AppShell, ProjectShell, RichEditor, ChatRoom, CalendarView, …
│   │   ├── ui/              shadcn-style primitives (Button, Dialog, Popover, Tabs, …)
│   │   └── shell/           Jump menu, New for You, My Bar, reminders, toasts
│   └── lib/                 api, icons, time, colors, variants (cn), shared UI state
└── shared/                  models.ts (DTOs), markdown.ts (safe renderer), types.ts
migrations/                  one table per file, applied at startup
tests/                       app.test.ts, tus.test.ts, workspace.test.ts
scripts/                     build, dev lifecycle, demo seed, page-registry generator
```

See `AGENTS.md` for the layering rules and conventions.
