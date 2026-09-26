/**
 * Client-only UI state shared across the chrome: which panels are open,
 * unread badge counts, "hold Shift" keycap hints, and toasts.
 * (Authenticated pages skip SSR, so this module state is per-browser.)
 */
export type MyPanel = "tasks" | "events" | "today" | "bookmarks" | "notes" | null;

export const ui = $state({
	jumpOpen: false,
	nfyOpen: false,
	shortcutsOpen: false,
	pingOpen: false,
	myPanel: null as MyPanel,
	showKeycaps: false,
	unread: 0,
	pingUnread: 0,
});

export interface Toast {
	id: number;
	kind: "success" | "error" | "info";
	text: string;
}

export const toasts = $state<{ items: Toast[] }>({ items: [] });
let nextId = 1;

export function toast(text: string, kind: Toast["kind"] = "success", ms = 4000): void {
	const id = nextId++;
	toasts.items.push({ id, kind, text });
	setTimeout(() => dismissToast(id), ms);
}

export function dismissToast(id: number): void {
	const i = toasts.items.findIndex((t) => t.id === id);
	if (i >= 0) toasts.items.splice(i, 1);
}
