import type { V2DocumentPublic } from "@/api/v2Documents"

/**
 * The library-hybrid mockup spells visibility out as three states. The document
 * model only stores `private | organization`, so "shared" is derived from
 * ownership: a document you don't own that's reached you is shared with you.
 */
export type DocumentScope = "private" | "organization" | "shared"

export function getDocumentScope(
  document: V2DocumentPublic,
  currentUserId: string,
): DocumentScope {
  if (document.owner_id !== currentUserId) return "shared"
  if (document.visibility === "organization") return "organization"
  return "private"
}

export const DOCUMENT_SCOPE_LABEL: Record<DocumentScope, string> = {
  private: "Private",
  organization: "Organization",
  shared: "Shared",
}

/** Chip / text color per scope — purple org, green shared, muted private. */
export const DOCUMENT_SCOPE_TEXT: Record<DocumentScope, string> = {
  private: "text-muted-foreground",
  organization: "text-[#8447ff]",
  shared: "text-emerald-600 dark:text-emerald-400",
}

/** Status-dot background per scope. */
export const DOCUMENT_SCOPE_DOT: Record<DocumentScope, string> = {
  private: "bg-muted-foreground/60",
  organization: "bg-[#8447ff]",
  shared: "bg-emerald-600 dark:bg-emerald-400",
}

/** Build up to two uppercase initials from a name or email. */
export function toInitials(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "?"
  const handle = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed
  const parts = handle.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return handle.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
