/** shadcn/ui variant classes (ported from shadcn's cva definitions). */
import { cn } from "./cn";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "ginger";
export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "xs";

const BUTTON_BASE =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer no-underline";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
	default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
	destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
	outline: "border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground",
	secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
	ghost: "hover:bg-accent hover:text-accent-foreground",
	link: "text-link underline-offset-4 hover:underline",
	ginger: "bg-ginger text-white shadow-sm hover:bg-ginger/90",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
	default: "h-9 px-4 py-2",
	sm: "h-8 rounded-md px-3 text-[13px]",
	xs: "h-7 rounded px-2 text-xs",
	lg: "h-10 rounded-md px-6",
	icon: "h-9 w-9",
	"icon-sm": "h-8 w-8",
};

export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize; class?: string } = {}): string {
	return cn(BUTTON_BASE, BUTTON_VARIANTS[opts.variant ?? "default"], BUTTON_SIZES[opts.size ?? "default"], opts.class);
}

export const inputClass =
	"flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClass =
	"flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "ginger" | "success";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
	default: "border-transparent bg-primary text-primary-foreground",
	secondary: "border-transparent bg-secondary text-secondary-foreground",
	outline: "text-foreground",
	destructive: "border-transparent bg-destructive text-destructive-foreground",
	ginger: "border-transparent bg-ginger-soft text-foreground",
	success: "border-transparent bg-accent text-accent-foreground",
};

export function badgeVariants(opts: { variant?: BadgeVariant; class?: string } = {}): string {
	return cn(
		"inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
		BADGE_VARIANTS[opts.variant ?? "default"],
		opts.class,
	);
}

export const cardClass = "rounded-lg border bg-card text-card-foreground shadow-sm";
export const menuItemClass =
	"relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 text-left no-underline text-foreground";
