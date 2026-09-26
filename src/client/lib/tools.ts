/** Tool metadata for the project toolbox (URLs, icons, blurbs). */
import type { IconNode } from "lucide";
import type { ToolKind } from "../../shared/models";
import * as icons from "./icons";

const SEGMENT: Record<ToolKind, string> = {
	message_board: "messages",
	todos: "todos",
	docs: "docs",
	schedule: "schedule",
	chat: "chat",
	card_table: "cards",
	checkins: "checkins",
	timesheet: "timesheet",
};

export const toolHref = (projectId: number, kind: ToolKind): string => `/projects/${projectId}/${SEGMENT[kind]}`;

const ICON: Record<ToolKind, IconNode> = {
	message_board: icons.Megaphone,
	todos: icons.CircleCheck,
	docs: icons.Folder,
	schedule: icons.CalendarDays,
	chat: icons.MessagesSquare,
	card_table: icons.SquareKanban,
	checkins: icons.MessageCircleQuestionMark,
	timesheet: icons.Timer,
};

export const toolIcon = (kind: ToolKind): IconNode => ICON[kind];

export const TOOL_BLURB: Record<ToolKind, { name: string; blurb: string }> = {
	message_board: { name: "Message Board", blurb: "Broadcast announcements & updates" },
	todos: { name: "To-dos", blurb: "Make lists, assign tasks, get stuff done" },
	docs: { name: "Docs & Files", blurb: "Store docs, files, PDFs, images, links" },
	schedule: { name: "Schedule", blurb: "Add events, milestones, deadlines" },
	chat: { name: "Chat", blurb: "Add a chat room to the project" },
	card_table: { name: "Card Table", blurb: "Move work through stages, Kanban-style" },
	checkins: { name: "Automatic Check-ins", blurb: "Ask the team a question on a schedule" },
	timesheet: { name: "Timesheet", blurb: "Track time spent on the project" },
};
