import { cn } from "@/lib/utils"

/** Scrollable v2 page frame inside TaskforceShell (no extra inset). */
export const V2_PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto"

/** Shared horizontal/bottom padding for v2 tab bodies; top inset comes from the shell. */
export const V2_PAGE_PADDING = "px-6 pb-6 pt-0 md:pb-8"

/**
 * Scrollable tab body — matches Agents list/detail layout inside shell main
 * padding (`px-6 pt-4 pb-6 md:px-8 md:pt-5 md:pb-8` on TaskforceShell).
 */
export const V2_PAGE_CONTENT = cn(
  "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto",
  V2_PAGE_PADDING,
)

/**
 * Padded page body when `V2_PAGE_FRAME` is the scroll container (avoids nested overflow
 * breaking `position: sticky`).
 */
export const V2_PAGE_BODY = cn("flex flex-col gap-6", V2_PAGE_PADDING)

/**
 * Library-style tab body: same padding as Agents, but overflow hidden for split panes.
 */
export const V2_PAGE_CONTENT_FIXED = cn(
  "flex min-h-0 flex-1 flex-col gap-6 overflow-hidden",
  V2_PAGE_PADDING,
)

/** Tab page meta line (e.g. "7d · personal") — page title lives in the h1 below. */
export const V2_TAB_EYEBROW_CLASS =
  "font-mono text-xs tracking-[0.01em] text-muted-foreground"

/** Sticky page header inside a padded scroll area (offsets horizontal `V2_PAGE_PADDING`). */
export const V2_STICKY_HEADER_CLASS = cn(
  "sticky top-0 z-30 -mx-6 shrink-0 border-b bg-background px-6 pt-4 pb-4",
)

/** @deprecated Prefer V2_PAGE_CONTENT for tab pages. */
export const V2_CONTENT_SHELL = V2_PAGE_CONTENT
