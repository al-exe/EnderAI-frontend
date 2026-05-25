/** Scrollable v2 page frame inside TaskforceShell (no extra horizontal inset). */
export const V2_PAGE_FRAME =
  "flex min-h-0 flex-1 flex-col overflow-y-auto"

/**
 * Inner page content padding — matches the Metrics tab (p-6 inside shell main
 * padding). Use on Library, Agents, Metrics, and other v2 tab bodies.
 */
export const V2_PAGE_CONTENT =
  "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6"

/** @deprecated Prefer V2_PAGE_CONTENT for tab pages. */
export const V2_CONTENT_SHELL = V2_PAGE_CONTENT
