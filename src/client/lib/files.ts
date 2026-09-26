/** File-type helpers for Docs & Files. */
import type { IconNode } from "lucide";
import type { VaultItem } from "../../shared/models";
import * as icons from "./icons";

export type FileGroup = "image" | "pdf" | "audio" | "video" | "sheet" | "doc" | "link" | "folder" | "other";

export function groupOf(item: VaultItem): FileGroup {
	if (item.kind === "folder") return "folder";
	if (item.kind === "doc") return "doc";
	if (item.kind === "link") return "link";
	const mime = item.attachment?.mime ?? "";
	if (mime.startsWith("image/")) return "image";
	if (mime === "application/pdf") return "pdf";
	if (mime.startsWith("audio/")) return "audio";
	if (mime.startsWith("video/")) return "video";
	if (/sheet|excel|csv/.test(mime)) return "sheet";
	if (/word|document|text\//.test(mime)) return "doc";
	return "other";
}

export const GROUP_LABEL: Record<FileGroup, string> = {
	image: "Images",
	pdf: "PDFs",
	audio: "Audio",
	video: "Video",
	sheet: "Spreadsheets",
	doc: "Documents",
	link: "Cloud links",
	folder: "Folders",
	other: "Other files",
};

export function iconOf(item: VaultItem): IconNode {
	switch (groupOf(item)) {
		case "folder":
			return icons.Folder;
		case "doc":
			return icons.FileText;
		case "link":
			return icons.Link;
		case "image":
			return icons.Image;
		case "audio":
			return icons.FileMusic;
		case "video":
			return icons.FileVideoCamera;
		default:
			return icons.File;
	}
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
	return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Guess the service behind an external link (for a nicer label). */
export function linkService(url: string | null): string {
	if (!url) return "Link";
	const host = (() => {
		try {
			return new URL(url).hostname;
		} catch {
			return "";
		}
	})();
	if (host.includes("figma")) return "Figma";
	if (host.includes("docs.google") || host.includes("drive.google")) return "Google Drive";
	if (host.includes("dropbox")) return "Dropbox";
	if (host.includes("zoom")) return "Zoom";
	if (host.includes("notion")) return "Notion";
	if (host.includes("github")) return "GitHub";
	if (host.includes("miro")) return "Miro";
	return host.replace(/^www\./, "") || "Link";
}
