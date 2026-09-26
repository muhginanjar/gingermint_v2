/**
 * Domain models shared by the server (services build them) and the client
 * (pages render them). Pure data — no runtime imports, no business logic.
 * Mirrors gingermint's app/models layer: entity + DTO shapes that cross
 * the Handler ↔ Service ↔ Page boundary.
 */

export const COLORS = [
	"gray",
	"red",
	"orange",
	"yellow",
	"green",
	"teal",
	"blue",
	"purple",
	"pink",
] as const;
export type Color = (typeof COLORS)[number];

export type ProjectRole = "admin" | "member" | "client";
export type ProjectStatus = "on_track" | "at_risk" | "off_track" | "done";

export const TOOL_KINDS = [
	"message_board",
	"todos",
	"docs",
	"schedule",
	"chat",
	"card_table",
	"checkins",
	"timesheet",
] as const;
export type ToolKind = (typeof TOOL_KINDS)[number];

/** Tools a client (Client Mode) can see when opened to them. */
export const CLIENT_TOOLS: ToolKind[] = ["message_board", "todos", "docs", "schedule"];

export interface Person {
	id: number;
	name: string;
	email: string;
	title: string;
	avatarUrl: string | null;
}

export interface Folder {
	id: number;
	name: string;
	color: Color;
	projectCount: number;
}

export interface ProjectTool {
	id: number;
	kind: ToolKind;
	name: string;
	position: number;
}

export interface ProjectSummary {
	id: number;
	name: string;
	description: string;
	icon: string;
	color: Color;
	logoUrl: string | null;
	folderId: number | null;
	access: "invite" | "all";
	isTemplate: boolean;
	archivedAt: string | null;
	starred: boolean;
	lead: Person | null;
	phase: string;
	status: ProjectStatus;
	startOn: string | null;
	endOn: string | null;
	memberCount: number;
	members: Person[];
	updatedAt: string;
}

export interface ProjectMember extends Person {
	role: "member" | "client";
}

export interface ProjectDetail extends ProjectSummary {
	tools: ProjectTool[];
	people: ProjectMember[];
	myRole: ProjectRole;
	notify: boolean;
	inboundEmail: string;
}

/** Minimal project info carried by every tool page (breadcrumb/header). */
export interface ProjectRef {
	id: number;
	name: string;
	icon: string;
	color: Color;
	logoUrl: string | null;
	myRole: ProjectRole;
	tools: ProjectTool[];
}

export interface ReactionGroup {
	emoji: string;
	count: number;
	mine: boolean;
	people: string[];
}

export type RecordableType =
	| "message"
	| "todo"
	| "todo_list"
	| "card"
	| "doc"
	| "file"
	| "link"
	| "folder"
	| "event"
	| "checkin_answer"
	| "checkin_question"
	| "chat_line"
	| "ping_message"
	| "comment"
	| "project"
	| "time_entry"
	| "forward";

export interface Comment {
	id: number;
	body: string;
	author: Person | null;
	createdAt: string;
	updatedAt: string;
	reactions: ReactionGroup[];
	canEdit: boolean;
}

export interface Message {
	id: number;
	projectId: number;
	title: string;
	body: string;
	category: string;
	pinned: boolean;
	clientVisible: boolean;
	author: Person | null;
	createdAt: string;
	updatedAt: string;
	commentCount: number;
	reactions: ReactionGroup[];
}

export interface TodoList {
	id: number;
	projectId: number;
	name: string;
	description: string;
	position: number;
	clientVisible: boolean;
	hillTracked: boolean;
	hillPosition: number;
	total: number;
	completed: number;
	createdAt: string;
}

export interface Todo {
	id: number;
	projectId: number;
	listId: number | null;
	parentId: number | null;
	title: string;
	notes: string;
	dueOn: string | null;
	position: number;
	completedAt: string | null;
	completedBy: Person | null;
	assignees: Person[];
	subtaskCount: number;
	subtasksDone: number;
	commentCount: number;
	createdBy: Person | null;
	createdAt: string;
}

export interface TodoDetail extends Todo {
	subtasks: Todo[];
	notifyOnDone: Person[];
	list: { id: number; name: string } | null;
	parent: { id: number; title: string } | null;
}

export type CardColumnKind = "triage" | "column" | "not_now" | "done";

export interface CardStep {
	id: number;
	title: string;
	assignee: Person | null;
	dueOn: string | null;
	completedAt: string | null;
}

export interface Card {
	id: number;
	columnId: number;
	title: string;
	body: string;
	dueOn: string | null;
	position: number;
	onHold: boolean;
	assignees: Person[];
	stepsTotal: number;
	stepsDone: number;
	commentCount: number;
	createdBy: Person | null;
	createdAt: string;
}

export interface CardDetail extends Card {
	steps: CardStep[];
	column: { id: number; name: string; color: Color };
}

export interface CardColumn {
	id: number;
	name: string;
	color: Color;
	kind: CardColumnKind;
	position: number;
	cards: Card[];
}

export type VaultKind = "folder" | "doc" | "file" | "link";

export interface Attachment {
	id: string;
	filename: string;
	mime: string;
	size: number;
	kind: "file" | "image" | "voice" | "video";
	url: string;
}

export interface VaultItem {
	id: number;
	projectId: number;
	parentId: number | null;
	kind: VaultKind;
	title: string;
	body: string;
	color: Color;
	url: string | null;
	description: string;
	imageUrl: string | null;
	attachment: Attachment | null;
	clientVisible: boolean;
	childCount: number;
	commentCount: number;
	createdBy: Person | null;
	createdAt: string;
	updatedAt: string;
}

export interface CalendarEvent {
	id: number;
	projectId: number;
	projectName: string;
	projectColor: Color;
	title: string;
	notes: string;
	startsAt: string;
	endsAt: string;
	allDay: boolean;
	videoUrl: string;
	location: string;
	clientVisible: boolean;
	participants: Person[];
	commentCount: number;
	createdBy: Person | null;
}

/** A row on the calendar: an event or (optionally) a due to-do/card. */
export interface CalendarEntry {
	kind: "event" | "todo" | "card";
	id: number;
	title: string;
	/** ISO timestamp for timed events; YYYY-MM-DD when allDay. */
	startsAt: string;
	endsAt: string;
	allDay: boolean;
	projectId: number;
	projectName: string;
	color: Color;
	url: string;
	people: Person[];
	videoUrl: string;
	completed: boolean;
}

export interface ChatLine {
	id: number;
	body: string;
	author: Person | null;
	attachment: Attachment | null;
	createdAt: string;
	reactions: ReactionGroup[];
}

export interface PingThread {
	id: number;
	participants: Person[];
	lastMessage: { body: string; authorName: string; createdAt: string } | null;
	unread: number;
	updatedAt: string;
}

export interface Notification {
	id: number;
	kind: string;
	title: string;
	excerpt: string;
	url: string;
	actor: Person | null;
	projectName: string | null;
	readAt: string | null;
	bubbleUpAt: string | null;
	createdAt: string;
}

export interface Activity {
	id: number;
	action: string;
	recordableType: RecordableType;
	recordableId: number;
	title: string;
	excerpt: string;
	url: string;
	actor: Person | null;
	projectId: number | null;
	projectName: string | null;
	createdAt: string;
}

export interface CheckinQuestion {
	id: number;
	projectId: number;
	question: string;
	frequency: "daily" | "weekly" | "biweekly" | "monthly";
	days: number[];
	timeOfDay: string;
	paused: boolean;
	answerCount: number;
	lastAskedOn: string | null;
	createdBy: Person | null;
}

export interface CheckinAnswer {
	id: number;
	questionId: number;
	body: string;
	askedOn: string;
	author: Person | null;
	commentCount: number;
	createdAt: string;
	reactions: ReactionGroup[];
}

export interface TimeEntry {
	id: number;
	projectId: number;
	projectName: string;
	person: Person | null;
	todo: { id: number; title: string } | null;
	date: string;
	minutes: number;
	description: string;
}

export interface HillUpdate {
	id: number;
	listId: number;
	listName: string;
	position: number;
	person: Person | null;
	createdAt: string;
}

export interface Bookmark {
	id: number;
	url: string;
	title: string;
	kind: string;
	context: string;
	createdAt: string;
}

export interface Visit {
	url: string;
	title: string;
	kind: string;
	context: string;
	visitedAt: string;
}

export interface SearchResult {
	kind: string;
	id: number;
	title: string;
	excerpt: string;
	url: string;
	context: string;
	createdAt: string;
}

export interface Forward {
	id: number;
	projectId: number;
	projectName: string;
	fromAddr: string;
	subject: string;
	body: string;
	createdAt: string;
}

export interface Webhook {
	id: number;
	url: string;
	active: boolean;
	lastStatus: number | null;
	createdAt: string;
}

export interface ApiToken {
	id: number;
	name: string;
	lastUsedAt: string | null;
	createdAt: string;
}

/** Shared props for every signed-in page: the chrome (My Bar, badges). */
export interface WorkspaceSummary {
	id: number;
	name: string;
	logoUrl: string | null;
	role: "admin" | "member" | "client";
	unread: number;
	current: boolean;
}

export interface ChromeProps {
	accountId: number;
	accountName: string;
	accountLogo: string | null;
	accountRole: "admin" | "member" | "client";
	/** Every workspace the viewer belongs to (for the switcher). */
	workspaces: WorkspaceSummary[];
	unreadCount: number;
	pingUnread: number;
}
