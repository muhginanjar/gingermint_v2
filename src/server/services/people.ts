/** People directory: Person DTOs, lookups, presence, profile fields. */
import type { Person } from "../../shared/models";
import {
	accountActiveSince,
	findPerson,
	listAccountPeople,
	listPeople,
	type PersonRow,
	touchLastSeen,
} from "../queries/people";
import { nowIso } from "./time";

export const toPerson = (r: PersonRow): Person => ({
	id: r.id,
	name: r.name,
	email: r.email,
	title: r.title,
	avatarUrl: r.avatarUrl,
});

/** All people keyed by id — accounts are small, one query beats N lookups. */
export function personMap(): Map<number, Person> {
	return new Map(listPeople.all().map((r) => [r.id, toPerson(r)]));
}

/** Everyone in a workspace (pickers, directories). */
export const allPeople = (accountId: number): Person[] => listAccountPeople.all(accountId).map(toPerson);

export function personById(id: number | null | undefined): Person | null {
	if (!id) return null;
	const row = findPerson.get(id);
	return row ? toPerson(row) : null;
}

export const pick = (map: Map<number, Person>, id: number | null | undefined): Person | null =>
	id ? (map.get(id) ?? null) : null;

const lastTouch = new Map<number, number>();

/** Record presence at most once a minute per person. */
export function markSeen(userId: number): void {
	const now = Date.now();
	if ((lastTouch.get(userId) ?? 0) > now - 60_000) return;
	lastTouch.set(userId, now);
	touchLastSeen.run(nowIso(), userId);
}

export function activeInLast24h(accountId: number): Person[] {
	return accountActiveSince.all(accountId, new Date(Date.now() - 86_400_000).toISOString()).map(toPerson);
}
