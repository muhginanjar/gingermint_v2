/**
 * Inbound email webhook: POST /inbound/:token with JSON
 * { from, subject, text } (or form fields From/Subject/TextBody|body-plain),
 * as sent by Postmark/Mailgun/SendGrid inbound parsing.
 */
import { receiveForward } from "../services/integrations";
import { body, type Ctx, str } from "./http";

export async function receive(c: Ctx) {
	const b = await body(c);
	const from = str(b.from ?? b.From ?? b.sender, 200);
	const subject = str(b.subject ?? b.Subject, 300);
	const text = str(b.text ?? b.TextBody ?? b["body-plain"] ?? b.body, 200_000);
	const id = receiveForward(c.req.param("token") ?? "", from, subject, text);
	if (!id) return c.json({ error: "Unknown inbox" }, 404);
	return c.json({ id }, 201);
}
