/** The revamped color palette used by projects, folders, card columns and the calendar. */
import type { Color } from "../../shared/models";

export const PALETTE: Record<Color, { dot: string; soft: string; strong: string; border: string; label: string }> = {
	gray: { dot: "bg-stone-400", soft: "bg-stone-100 dark:bg-stone-800/60", strong: "bg-stone-500", border: "border-t-stone-400", label: "Gray" },
	red: { dot: "bg-red-500", soft: "bg-red-50 dark:bg-red-950/50", strong: "bg-red-500", border: "border-t-red-500", label: "Red" },
	orange: { dot: "bg-orange-500", soft: "bg-orange-50 dark:bg-orange-950/50", strong: "bg-orange-500", border: "border-t-orange-500", label: "Orange" },
	yellow: { dot: "bg-amber-400", soft: "bg-amber-50 dark:bg-amber-950/40", strong: "bg-amber-400", border: "border-t-amber-400", label: "Yellow" },
	green: { dot: "bg-green-600", soft: "bg-green-50 dark:bg-green-950/50", strong: "bg-green-600", border: "border-t-green-600", label: "Green" },
	teal: { dot: "bg-teal-500", soft: "bg-teal-50 dark:bg-teal-950/50", strong: "bg-teal-500", border: "border-t-teal-500", label: "Teal" },
	blue: { dot: "bg-blue-500", soft: "bg-blue-50 dark:bg-blue-950/50", strong: "bg-blue-500", border: "border-t-blue-500", label: "Blue" },
	purple: { dot: "bg-violet-500", soft: "bg-violet-50 dark:bg-violet-950/50", strong: "bg-violet-500", border: "border-t-violet-500", label: "Purple" },
	pink: { dot: "bg-pink-500", soft: "bg-pink-50 dark:bg-pink-950/50", strong: "bg-pink-500", border: "border-t-pink-500", label: "Pink" },
};

export const colorOf = (c: string | null | undefined) => PALETTE[(c as Color) in PALETTE ? (c as Color) : "gray"];

/** Stable avatar background for people without a photo. */
const AVATAR_BG = ["bg-rose-600", "bg-orange-600", "bg-amber-600", "bg-emerald-600", "bg-teal-600", "bg-sky-600", "bg-indigo-600", "bg-fuchsia-600"];
export const avatarBg = (id: number) => AVATAR_BG[id % AVATAR_BG.length] ?? "bg-stone-600";

export function initials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((s) => s[0]?.toUpperCase() ?? "")
			.join("") || "?"
	);
}
