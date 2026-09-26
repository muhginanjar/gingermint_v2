/** Global keyboard shortcuts (Shift + key). Ignored while typing in fields. */
export interface Shortcut {
	keys: string;
	label: string;
	group: "Navigate" | "Personal" | "Anywhere";
}

export const SHORTCUTS: Shortcut[] = [
	{ keys: "Shift J", label: "Jump menu — search or jump anywhere", group: "Anywhere" },
	{ keys: "⌘/Ctrl K", label: "Jump menu (alternative)", group: "Anywhere" },
	{ keys: "?", label: "Show keyboard shortcuts", group: "Anywhere" },
	{ keys: "Hold Shift", label: "Reveal keycaps on screen", group: "Anywhere" },
	{ keys: "Shift H", label: "Home", group: "Navigate" },
	{ keys: "Shift A", label: "Latest Activity", group: "Navigate" },
	{ keys: "Shift C", label: "Calendar", group: "Navigate" },
	{ keys: "Shift R", label: "Reports", group: "Navigate" },
	{ keys: "Shift E", label: "Everything", group: "Navigate" },
	{ keys: "Shift P", label: "Pings", group: "Navigate" },
	{ keys: "Shift N", label: "New for you", group: "Personal" },
	{ keys: "Shift 1", label: "My Tasks", group: "Personal" },
	{ keys: "Shift 2", label: "My Events", group: "Personal" },
	{ keys: "Shift 3", label: "Due Today", group: "Personal" },
	{ keys: "Shift 4", label: "My Bookmarks", group: "Personal" },
	{ keys: "Shift 5", label: "My Notes", group: "Personal" },
];

export function isTyping(e: KeyboardEvent): boolean {
	const t = e.target as HTMLElement | null;
	if (!t) return false;
	const tag = t.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}
