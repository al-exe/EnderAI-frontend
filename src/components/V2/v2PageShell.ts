import { cn } from "@/lib/utils"

/** Scrollable v2 page frame inside TaskforceShell (no extra inset). */
export const V2_PAGE_FRAME =
  "flex min-h-0 flex-1 flex-col overflow-y-auto"

/** Shared padding for v2 tab bodies (Agents default). */
export const V2_PAGE_PADDING = "p-6"

/**
 * Scrollable tab body — matches Agents list/detail layout inside shell main
 * padding (`p-6 md:p-8` on TaskforceShell).
 */
export const V2_PAGE_CONTENT = cn(
  "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto",
  V2_PAGE_PADDING,
)

/**
 * Library-style tab body: same padding as Agents, but overflow hidden for split panes.
 */
export const V2_PAGE_CONTENT_FIXED = cn(
  "flex min-h-0 flex-1 flex-col gap-6 overflow-hidden",
  V2_PAGE_PADDING,
)

/** Tab page meta line (e.g. "Metrics · 7d · personal"). */
export const V2_TAB_EYEBROW_CLASS =
  "font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"

/** Sticky page header inside a `V2_PAGE_CONTENT` scroll area (offsets `p-6` padding). */
export const V2_STICKY_HEADER_CLASS = cn(
  "sticky top-0 z-20 -mx-6 shrink-0 border-b bg-background px-6 pb-4",
)

/** @deprecated Prefer V2_PAGE_CONTENT for tab pages. */
export const V2_CONTENT_SHELL = V2_PAGE_CONTENT
