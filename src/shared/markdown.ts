/**
 * Safe Markdown → HTML renderer shared by client (rich text display) and
 * server (plain-text excerpts for notifications/activity).
 *
 * Security model: the whole source is HTML-escaped FIRST, then Markdown
 * syntax is turned into a fixed set of tags. URLs are restricted to
 * http(s)/mailto/relative, and media embeds only accept same-origin
 * /files/ paths. Nothing user-controlled can open a tag or an attribute.
 *
 * Supported: headings, bold/italic/strike, inline code, fenced code blocks,
 * block quotes, ordered/unordered/task lists, GFM pipe tables, horizontal
 * rules, links, autolinks, images and voice notes (same-origin only), and
 * @mentions written as `@[Name](mention:ID)`.
 */

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export const escapeHtml = (s: string): string =>
	s.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch);

const SAFE_URL = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
const SAME_ORIGIN_MEDIA = /^\/(files|uploads)\/[A-Za-z0-9_-]+$/;

function safeUrl(url: string): string | null {
	const u = url.trim();
	return SAFE_URL.test(u) ? u : null;
}

/** Inline formatting on an already-escaped string. */
function inline(text: string): string {
	const slots: string[] = [];
	const hold = (html: string) => {
		slots.push(html);
		return `\uE000${slots.length - 1}\uE000`;
	};

	// U+E000 delimits held fragments; strip any occurrence from user text.
	let s = text.replace(/\uE000/g, "");
	// Code spans first — their content is never formatted further.
	s = s.replace(/`([^`\n]+)`/g, (_m, code: string) =>
		hold(`<code>${code}</code>`),
	);
	// Voice notes: !audio[label](/files/id)
	s = s.replace(/!audio\[([^\]]*)\]\(([^)\s]+)\)/g, (m, label: string, url: string) =>
		SAME_ORIGIN_MEDIA.test(url)
			? hold(
					`<span class="rt-audio"><audio controls preload="metadata" src="${url}"></audio><span>${label}</span></span>`,
				)
			: m,
	);
	// Images: ![alt](/files/id)
	s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt: string, url: string) =>
		SAME_ORIGIN_MEDIA.test(url)
			? hold(`<img src="${url}" alt="${alt}" loading="lazy" />`)
			: m,
	);
	// Mentions: @[Name](mention:12)
	s = s.replace(/@\[([^\]]+)\]\(mention:(\d+)\)/g, (_m, name: string, id: string) =>
		hold(`<span class="rt-mention" data-user-id="${id}">@${name}</span>`),
	);
	// Links: [text](url)
	s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
		const href = safeUrl(url.replace(/&amp;/g, "&"));
		if (!href) return m;
		const ext = /^https?:/i.test(href);
		return hold(
			`<a href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`,
		);
	});
	// Autolinks.
	s = s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => {
		const raw = url.replace(/&amp;/g, "&");
		return hold(
			`<a href="${escapeHtml(raw)}" target="_blank" rel="noopener noreferrer">${url}</a>`,
		);
	});
	s = s
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_]+)__/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
		.replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>")
		.replace(/~~([^~]+)~~/g, "<del>$1</del>");

	// Restore held fragments (may be nested, so loop until stable).
	let prev = "";
	while (prev !== s) {
		prev = s;
		s = s.replace(/\uE000(\d+)\uE000/g, (_m, i: string) => slots[Number(i)] ?? "");
	}
	return s;
}

const splitRow = (line: string): string[] =>
	line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((c) => c.trim());

const isTableSep = (line: string | undefined): boolean =>
	!!line && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/** Render Markdown to a safe HTML string. */
export function renderMarkdown(source: string): string {
	const lines = escapeHtml(source.replace(/\r\n?/g, "\n")).split("\n");
	const out: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i] ?? "";

		// Fenced code block.
		const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
		if (fence) {
			const lang = fence[1] ?? "";
			const body: string[] = [];
			i++;
			while (i < lines.length && !/^\s*```\s*$/.test(lines[i] ?? "")) {
				body.push(lines[i] ?? "");
				i++;
			}
			i++; // closing fence
			out.push(
				`<pre class="rt-code"${lang ? ` data-lang="${lang}"` : ""}><code>${body.join("\n")}</code></pre>`,
			);
			continue;
		}

		if (/^\s*$/.test(line)) {
			i++;
			continue;
		}

		const heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			const level = Math.min((heading[1] ?? "#").length + 0, 6);
			out.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
			i++;
			continue;
		}

		if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
			out.push("<hr />");
			i++;
			continue;
		}

		// Table: header row + separator row.
		if (line.includes("|") && isTableSep(lines[i + 1])) {
			const head = splitRow(line);
			i += 2;
			const rows: string[][] = [];
			while (i < lines.length && (lines[i] ?? "").includes("|") && !/^\s*$/.test(lines[i] ?? "")) {
				rows.push(splitRow(lines[i] ?? ""));
				i++;
			}
			out.push(
				`<div class="rt-table"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows
					.map(
						(r) =>
							`<tr>${head.map((_h, ci) => `<td>${inline(r[ci] ?? "")}</td>`).join("")}</tr>`,
					)
					.join("")}</tbody></table></div>`,
			);
			continue;
		}

		// Block quote (escaped '>' is '&gt;').
		if (/^&gt;\s?/.test(line)) {
			const body: string[] = [];
			while (i < lines.length && /^&gt;\s?/.test(lines[i] ?? "")) {
				body.push((lines[i] ?? "").replace(/^&gt;\s?/, ""));
				i++;
			}
			out.push(`<blockquote>${renderInlineParagraphs(body)}</blockquote>`);
			continue;
		}

		// Lists.
		const ul = /^\s*[-*+]\s+/;
		const ol = /^\s*\d+[.)]\s+/;
		if (ul.test(line) || ol.test(line)) {
			const ordered = ol.test(line);
			const re = ordered ? ol : ul;
			const items: string[] = [];
			while (i < lines.length && re.test(lines[i] ?? "")) {
				let item = (lines[i] ?? "").replace(re, "");
				const task = item.match(/^\[([ xX])\]\s+(.*)$/);
				if (task) {
					const done = task[1] !== " ";
					item = `<span class="rt-task${done ? " rt-task-done" : ""}">${done ? "☑" : "☐"}</span> ${inline(task[2] ?? "")}`;
				} else {
					item = inline(item);
				}
				items.push(`<li>${item}</li>`);
				i++;
			}
			const tag = ordered ? "ol" : "ul";
			out.push(`<${tag}>${items.join("")}</${tag}>`);
			continue;
		}

		// Paragraph: consecutive non-special lines.
		const para: string[] = [];
		while (
			i < lines.length &&
			!/^\s*$/.test(lines[i] ?? "") &&
			!/^(#{1,6})\s+/.test(lines[i] ?? "") &&
			!/^\s*```/.test(lines[i] ?? "") &&
			!/^&gt;\s?/.test(lines[i] ?? "") &&
			!ul.test(lines[i] ?? "") &&
			!ol.test(lines[i] ?? "") &&
			!((lines[i] ?? "").includes("|") && isTableSep(lines[i + 1]))
		) {
			para.push(lines[i] ?? "");
			i++;
		}
		out.push(`<p>${para.map(inline).join("<br />")}</p>`);
	}
	return out.join("\n");
}

function renderInlineParagraphs(lines: string[]): string {
	return lines
		.join("\n")
		.split(/\n\s*\n/)
		.map((p) => `<p>${p.split("\n").map(inline).join("<br />")}</p>`)
		.join("");
}

/** Strip Markdown syntax for short previews ("excerpt" lines). */
export function toPlainText(source: string, max = 160): string {
	const text = source
		.replace(/```[\s\S]*?```/g, " [code] ")
		.replace(/!audio\[[^\]]*\]\([^)]*\)/g, " 🎙 Voice note ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, " 🖼 Image ")
		.replace(/@\[([^\]]+)\]\(mention:\d+\)/g, "@$1")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/[#>*_~`|]/g, "")
		.replace(/^\s*[-+]\s+/gm, "")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** User ids mentioned in a body (`@[Name](mention:ID)`). */
export function mentionedIds(source: string): number[] {
	const ids = new Set<number>();
	for (const m of source.matchAll(/@\[[^\]]+\]\(mention:(\d+)\)/g)) {
		ids.add(Number(m[1]));
	}
	return [...ids];
}
