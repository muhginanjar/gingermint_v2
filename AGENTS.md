# AGENTS.md — GingerMint v2

GingerMint is a Basecamp-5-style project collaboration app built on the
**Dulak** boilerplate (Bun + Hono + bun:sqlite in WAL mode + Inertia v3 +
Svelte 5 + Tailwind v4), with the **layering from gingermint (Go)**:
routes → handlers → services → queries. Read this before adding code.

> 🔴 Don't start dev servers on the user's behalf. Verify with
> `bun run typecheck`, `bun run build` and `bun run test` (the tests drive the
> whole app in-process through `app.request()`, no server needed).

## Stack

- **Bun ≥ 1.3** runtime, bundler and test runner.
- **Hono 4** HTTP, served by `Bun.serve` (`src/index.ts`).
- **bun:sqlite** with `journal_mode=WAL`, `synchronous=NORMAL`,
  `busy_timeout=5000`, `foreign_keys=ON` (`src/server/db.ts`).
- **Inertia v3 + Svelte 5** (runes). Page registry `src/client/pages.ts` is
  **generated** — run `bun run pages` (also part of `bun run build`).
- **Tailwind v4** with **shadcn/ui tokens** (`background`, `card`, `primary`,
  `muted-foreground`, … in `src/client/styles.css`, bridged in
  `src/client/tailwind.css`) and shadcn-pattern components in
  `src/client/components/ui/`.

## Three-tier rule (🔴 critical)

```
routes/<ns>.routes.ts → handlers/<feature>.ts → services/<feature>.ts → queries/<domain>.ts → SQLite
```

| Layer | Lives in | May | May not |
|---|---|---|---|
| Routes | `src/server/routes/` | Map URL + guard → handler | Logic, SQL |
| Handlers | `src/server/handlers/` | Parse input (`handlers/http.ts` helpers), call services, render/redirect/JSON | SQL, business rules |
| Services | `src/server/services/` | Business logic, access control, notifications, activity | Import `db`, write SQL (use `queries/tx.ts` for transactions) |
| Queries | `src/server/queries/` | **The only place SQL is written** (prepared `db.query(...)`) | Business logic |
| Models | `src/shared/models.ts` | Pure DTO types shared by server + client | Runtime code |

`src/server/db.ts` keeps the connection, WAL pragmas, migrations and the
boilerplate auth statements (users/sessions/resets/uploads). New domains get
their own `queries/<domain>.ts`. Tests (`tests/*.test.ts`) may call anything.

### Workspaces (`services/accounts.ts`)
A person can belong to several workspaces (`accounts` + `account_members`,
role `admin | member | client`). Each request acts in **one** workspace: the
session's `account_id`, else their first membership (self sign-ups join
workspace 1). `c.var.user` carries `accountId` + `accountRole`, and
`user.role` is derived from the workspace role — so `isAdmin` / `requireRole`
are per workspace. **Every new query that lists workspace data must filter by
`user.accountId`** (projects, folders, notifications, pings, bookmarks, visits,
API tokens carry `account_id`; everything else hangs off a project). Opening a
project from another of your workspaces throws `WorkspaceSwitch`, which
`app.ts` turns into a switch + reload.

### Access control (`services/access.ts`)
A person sees a project of the current workspace when they are its admin, a
project member (role `member` or `client`), or the project is **All-access**
(not for workspace clients). Services load
projects with `loadProject` (404 when not visible — never leak existence) or
`loadProjectAsTeam` (403 for clients). **Client Mode:** clients only see
`client_visible` rows and the tools in `CLIENT_TOOLS`.

### Errors (`services/errors.ts`)
Throw `InputError({ field: "message" })`, `NotFoundError`, `ForbiddenError`.
`app.ts` maps them: Inertia requests get field errors flashed + a 303 back
(forms show them via the `errors` prop); `fetch()` callers get JSON 422/404/403.

### Side effects
Every meaningful write calls `activity.record()` (feeds Latest Activity,
Wrap-up, project activity and **outgoing webhooks**) and usually
`notify()` / `notifyMentions()` (New for You + email for @mentions).

## Where things are

| Feature | Handler | Service | Page(s) |
|---|---|---|---|
| Home, folders | `home.ts` | `projects.ts` | `home/Index` |
| Project page, tools, people, templates, webhooks | `projects.ts` | `projects.ts`, `integrations.ts` | `projects/*` |
| Message Board | `messages.ts` | `messages.ts` | `messages/*` |
| To-dos, loose to-dos, subtasks, Hill Charts | `todos.ts` | `todos.ts` | `todos/*` |
| Card Table | `cards.ts` | `cards.ts` | `cards/*` |
| Docs & Files, uploads | `docs.ts`, `files.ts` | `vault.ts`, `attachments.ts` | `docs/*` |
| Schedule, Calendar, ICS, reminders | `schedule.ts` | `schedule.ts` | `schedule/*`, `calendar/Index` |
| Chat / Pings | `chat.ts`, `pings.ts` | `chat.ts`, `pings.ts` | `chat/Index`, `pings/*` |
| Comments, boosts, subscriptions, Bubble Up, bookmarks | `comments.ts` | `comments.ts`, `inbox.ts` | `components/CommentThread`, `RecordBar` |
| New for You, My Bar (tasks/events/today/bookmarks/notes) | `my.ts` | `inbox.ts`, `schedule.ts` | `components/shell/*` |
| Automatic Check-ins (+ scheduler) | `checkins.ts` | `checkins.ts` | `checkins/*` |
| Timesheet | `timesheet.ts` | `timesheet.ts` | `timesheet/Index` |
| Activity, search/jump, Everything, Reports, Lineup | `activity.ts`, `discovery.ts` | `activity.ts`, `discovery.ts` | `activity`, `search`, `everything`, `reports` |
| Adminland | `adminland.ts` | `admin.ts` | `adminland/Index` |
| Workspaces (list, create, switch, rename, leave, delete) | `workspaces.ts` | `accounts.ts` | `workspaces/Index`, Jump menu |
| JSON API v1 (tokens) | `api.ts` | same services | — |
| Inbound email | `inbound.ts` | `integrations.ts` | — |

## Migrations

`migrations/NNNN_*.sql`, applied at startup in a transaction and recorded in
`schema_migrations`. **One file = one table. Never edit an applied migration** —
add a new numbered file.

## Frontend rules

- Pages use `AppShell` (global chrome) or `ProjectShell` (inside a project).
  Record pages put `RecordBar` on top (Bookmark · Notifying · Bubble up · ···).
- Use the shadcn components in `components/ui/` and token utilities
  (`bg-card`, `text-muted-foreground`, `border-input`, `bg-primary`, `text-ginger`…).
  Never hardcode hex colors. Icons: `components/ui/Icon.svelte` + `lib/icons.ts`
  (lucide data) — no emoji as UI icons (emoji are fine as user content).
- Svelte 5: `$derived` for derived state; `$effect` only for side effects.
  If an effect calls a function that touches shared state, wrap it in
  `untrack(...)` (see the flash→toast effect in `AppShell.svelte`).
- Forms: `router.post/patch/delete` from `@inertiajs/svelte`; JSON endpoints
  via `lib/api.ts` (same-origin `fetch`; the server's CSRF defense is the
  Origin check + SameSite=Lax cookie).
- Keyed `{#each}` blocks must have unique keys — dedupe merged lists.
- Rich text is Markdown rendered by `shared/markdown.ts` (escapes first, then
  whitelists tags; media only from `/files/`). Don't add `{@html}` of raw user input.

## Hono integration notes (do not "fix")

- Middleware runs in registration order; global `app.use()` middleware must
  precede the routes they cover.
- Middleware/guards MUST call `next()` to continue the chain — returning
  `undefined` without `next()` errors with "Context is not finalized".
- Hono converts HEAD → GET (body stripped, headers kept) but `c.req.method`
  still reports "HEAD"; tus `dispatch` relies on this.
- `c.header()`-queued headers are dropped when a handler returns a custom
  `Response` — cookie helpers append to `c.res.headers` instead.
- The `/*` wildcard produces no named param — derive path segments from
  `c.req.path` (see `uploads.routes.ts`).
- `hono/conninfo`'s ESM build is an empty stub in 4.13 — the rate limiter
  reads the peer IP from `c.env` (the Bun server) instead.
- `@sinclair/typebox` does not pre-register string formats — `email` is
  registered in `validation.ts`; add others there.
- The Web `CompressionStream` API is NOT reliably available in every Bun
  1.3.14 context — compression uses `node:zlib` (`compress.ts`), and any
  future code should avoid relying on Web compression globals.

## Testing

- `bun run test` (= `bun test --isolate`). Never plain `bun test`.
- `tests/app.test.ts` / `tests/tus.test.ts`: boilerplate auth/uploads.
- `tests/workspace.test.ts`: end-to-end coverage of the workspace features.
- New suites set env (`DATABASE_PATH=:memory:`, `UPLOAD_DIR`…) in `beforeAll`
  **before** importing the app — mirror the existing files.
- Also run `bun run typecheck` and `bun run build` before finishing.

## Demo data

`bun run db:demo` seeds the "Enormicom" demo account through the real
services (password `password123`; admin `chad@enormicom.test`, client
`gwen@ghdesigns.test`).
