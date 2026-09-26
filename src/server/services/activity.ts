/**
 * Activity recording + reading. Every meaningful write calls `record()`,
 * which feeds Latest Activity, project activity, Wrap-up, and fires the
 * project's outgoing webhooks (third-party integrations).
 */
import type { Activity, RecordableType } from "../../shared/models";
import type { User } from "../../shared/types";
import { toPlainText } from "../../shared/markdown";
import {
	type ActivityRow,
	insertActivity,
	listActivities,
	listActivitiesBetween,
} from "../queries/activities";
import { listActiveWebhooks, setWebhookStatus } from "../queries/integrations";
import { touchProject } from "../queries/projects";
import { scopeFor } from "./access";
import { personMap, pick } from "./people";
import { nowIso } from "./time";

export interface ActivityInput {
	projectId: number | null;
	actorId: number | null;
	action: string;
	type: RecordableType;
	id: number;
	title: string;
	excerpt?: string;
	url: string;
	clientVisible?: boolean;
}

export function record(input: ActivityInput): void {
	const excerpt = input.excerpt ? toPlainText(input.excerpt, 240) : "";
	insertActivity.get(
		input.projectId,
		input.actorId,
		input.action,
		input.type,
		input.id,
		input.title,
		excerpt,
		input.url,
		input.clientVisible ? 1 : 0,
	);
	if (input.projectId) {
		touchProject.run(nowIso(), input.projectId);
		fireWebhooks(input.projectId, { ...input, excerpt });
	}
}

function fireWebhooks(projectId: number, payload: ActivityInput): void {
	const hooks = listActiveWebhooks.all(projectId);
	for (const hook of hooks) {
		// Fire-and-forget: integrations must never slow down or break a write.
		fetch(hook.url, {
			method: "POST",
			headers: { "content-type": "application/json", "user-agent": "GingerMint-Webhooks/1.0" },
			body: JSON.stringify({ event: `${payload.type}.${payload.action}`, ...payload, at: nowIso() }),
			signal: AbortSignal.timeout(5000),
		})
			.then((res) => setWebhookStatus.run(res.status, hook.id))
			.catch(() => setWebhookStatus.run(0, hook.id));
	}
}

export function toActivities(rows: ActivityRow[]): Activity[] {
	const people = personMap();
	return rows.map((r) => ({
		id: r.id,
		action: r.action,
		recordableType: r.recordableType as Activity["recordableType"],
		recordableId: r.recordableId,
		title: r.title,
		excerpt: r.excerpt,
		url: r.url,
		actor: pick(people, r.actorId),
		projectId: r.projectId,
		projectName: r.projectName,
		createdAt: r.createdAt,
	}));
}

export function timeline(
	user: User,
	opts: { projectId?: number; actorId?: number; before?: string; limit?: number } = {},
): Activity[] {
	const scope = scopeFor(user);
	return toActivities(
		listActivities.all(
			scope.full,
			scope.client,
			opts.projectId ?? 0,
			opts.actorId ?? 0,
			opts.before ?? "9999",
			opts.limit ?? 50,
		),
	);
}

export function between(user: User, from: string, to: string, projectId = 0): Activity[] {
	const scope = scopeFor(user);
	return toActivities(listActivitiesBetween.all(scope.full, scope.client, from, to, projectId));
}
