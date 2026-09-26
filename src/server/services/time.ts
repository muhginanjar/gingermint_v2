/** Date helpers shared by services. Dates are YYYY-MM-DD, timestamps ISO UTC. */

export const nowIso = (): string => new Date().toISOString();

export const toDateStr = (d: Date): string => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

export const today = (): string => toDateStr(new Date());

export const addDays = (date: string, days: number): string => {
	const d = new Date(`${date}T00:00:00`);
	d.setDate(d.getDate() + days);
	return toDateStr(d);
};

export const isDateStr = (v: unknown): v is string =>
	typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
