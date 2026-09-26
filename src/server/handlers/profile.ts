/** Profile extras: job title, personal API tokens, calendar subscription link. */
import * as integrations from "../services/integrations";
import { setTitle } from "../services/admin";
import { calendarToken } from "../services/schedule";
import { config } from "../config";
import { personById } from "../services/people";
import { back, body, type Ctx, id, me, str } from "./http";

export function extras(c: Ctx) {
	const user = me(c);
	return {
		title: personById(user.id)?.title ?? "",
		tokens: integrations.tokens(user),
		feedUrl: `${config.appUrl}/calendar/feed/${calendarToken(user)}.ics`,
		apiBase: `${config.appUrl}/api/v1`,
	};
}

export async function saveTitle(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	setTitle(user, user.id, str(b.title, 80));
	return back(c, "/profile", { success: "Saved." });
}

export async function createToken(c: Ctx) {
	const user = me(c);
	const b = await body(c);
	const token = integrations.createToken(user, str(b.name, 80));
	return c.json({ token, tokens: integrations.tokens(user) });
}

export function revokeToken(c: Ctx) {
	const user = me(c);
	integrations.revokeToken(user, id(c));
	return back(c, "/profile", { success: "Token revoked." });
}
