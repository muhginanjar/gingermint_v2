/** Date/time formatting in the viewer's locale + timezone. */

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }) : null;

export function relativeTime(iso: string, now = Date.now()): string {
	const t = Date.parse(iso);
	if (Number.isNaN(t)) return "";
	const diff = (t - now) / 1000;
	const abs = Math.abs(diff);
	if (abs < 45) return "just now";
	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		["minute", 60],
		["hour", 3600],
		["day", 86400],
		["week", 604800],
	];
	for (let i = units.length - 1; i >= 0; i--) {
		const [unit, secs] = units[i] ?? ["minute", 60];
		if (abs >= secs || unit === "minute") {
			if (unit === "week" && abs > 4 * 604800) return formatDate(iso);
			const value = Math.round(diff / secs);
			return rtf ? rtf.format(value, unit) : `${Math.abs(value)} ${unit}s ago`;
		}
	}
	return formatDate(iso);
}

/** "3m ago" style (compact, used in activity/notifications). */
export function shortAgo(iso: string, now = Date.now()): string {
	const s = Math.max(0, (now - Date.parse(iso)) / 1000);
	if (s < 60) return "now";
	if (s < 3600) return `${Math.floor(s / 60)}m ago`;
	if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
	if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
	return formatDate(iso);
}

/** Parse YYYY-MM-DD as a local date (not UTC). */
export function localDate(ymd: string): Date {
	const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function ymd(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const todayYmd = (): string => ymd(new Date());

export function addDaysYmd(date: string, days: number): string {
	const d = localDate(date);
	d.setDate(d.getDate() + days);
	return ymd(d);
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
	const d = value.length <= 10 ? localDate(value) : new Date(value);
	const sameYear = d.getFullYear() === new Date().getFullYear();
	return d.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: "numeric" });
}

export function formatDay(value: string): string {
	const d = value.length <= 10 ? localDate(value) : new Date(value);
	return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
	return `${formatDay(iso)}, ${formatTime(iso)}`;
}

/** Local date key (YYYY-MM-DD) for grouping an ISO timestamp or date. */
export function dayKey(value: string): string {
	return value.length <= 10 ? value : ymd(new Date(value));
}

export function dueLabel(dueOn: string | null): { text: string; tone: "overdue" | "today" | "soon" | "later" } | null {
	if (!dueOn) return null;
	const today = todayYmd();
	if (dueOn < today) return { text: `Overdue · ${formatDate(dueOn)}`, tone: "overdue" };
	if (dueOn === today) return { text: "Due today", tone: "today" };
	if (dueOn === addDaysYmd(today, 1)) return { text: "Due tomorrow", tone: "soon" };
	return { text: `Due ${formatDate(dueOn)}`, tone: "later" };
}

export function greeting(d = new Date()): string {
	const h = d.getHours();
	if (h < 5) return "Good evening";
	if (h < 12) return "Good morning";
	if (h < 18) return "Good afternoon";
	return "Good evening";
}

export function minutesLabel(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** Local "later today / tomorrow 9am / Saturday 9am / next Monday 9am" for Bubble Up. */
export function bubbleUpAt(preset: "later_today" | "tomorrow" | "weekend" | "next_week", now = new Date()): string {
	const d = new Date(now);
	const nine = (x: Date) => {
		x.setHours(9, 0, 0, 0);
		return x.toISOString();
	};
	switch (preset) {
		case "later_today":
			return new Date(now.getTime() + 3 * 3600_000).toISOString();
		case "tomorrow":
			d.setDate(d.getDate() + 1);
			return nine(d);
		case "weekend":
			d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
			return nine(d);
		case "next_week":
			d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
			return nine(d);
	}
}
