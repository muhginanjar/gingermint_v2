import type { CheckinQuestion } from "../../shared/models";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function time(hhmm: string): string {
	const [h, m] = hhmm.split(":").map(Number);
	const d = new Date();
	d.setHours(h ?? 9, m ?? 0, 0, 0);
	return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function scheduleLabel(q: Pick<CheckinQuestion, "frequency" | "days" | "timeOfDay">): string {
	const days = q.days.map((d) => DAY[d] ?? "").filter(Boolean);
	switch (q.frequency) {
		case "daily":
			return `every weekday at ${time(q.timeOfDay)}`;
		case "weekly":
			return `every ${days.join(", ") || "week"} at ${time(q.timeOfDay)}`;
		case "biweekly":
			return `every other ${days.join(", ") || "week"} at ${time(q.timeOfDay)}`;
		case "monthly":
			return `on the first ${days[0] ?? "day"} of each month at ${time(q.timeOfDay)}`;
	}
}

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
