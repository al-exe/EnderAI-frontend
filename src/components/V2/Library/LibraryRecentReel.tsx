import { Link } from "@tanstack/react-router"
import { Folder } from "lucide-react"
import { useMemo } from "react"

import type { V2DocumentPublic } from "@/api/v2Documents"
import type { UserPublic } from "@/client"
import { formatRelativeTime } from "@/components/V2/Agents/formatters"
import {
  DOCUMENT_SCOPE_LABEL,
  DOCUMENT_SCOPE_TEXT,
  getDocumentScope,
  toInitials,
} from "@/components/V2/Library/documentScope"
import { cn } from "@/lib/utils"

const MAX_CARDS = 4
const MAX_AVATARS = 3

function timestampOf(document: V2DocumentPublic): number {
  const value = document.updated_at ?? document.created_at
  const parsed = value ? new Date(value).getTime() : Number.NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

function buildAvatars(
  document: V2DocumentPublic,
  currentUser: UserPublic,
): { labels: string[]; overflow: number } {
  const labels: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined) => {
    if (!raw) return
    const label = toInitials(raw)
    if (seen.has(label)) return
    seen.add(label)
    labels.push(label)
  }

  if (document.owner_id === currentUser.id) {
    push(currentUser.full_name || currentUser.email)
  }
  for (const share of document.shared_with ?? []) {
    push(share.full_name || share.email)
  }
  if (labels.length === 0) {
    // Shared-to-you docs may not enumerate members; fall back to the title.
    push(document.title)
  }

  return {
    labels: labels.slice(0, MAX_AVATARS),
    overflow: Math.max(0, labels.length - MAX_AVATARS),
  }
}

function RecentCard({
  document,
  currentUser,
}: {
  document: V2DocumentPublic
  currentUser: UserPublic
}) {
  const scope = getDocumentScope(document, currentUser.id)
  const sharedByOther = document.owner_id !== currentUser.id
  const { labels, overflow } = buildAvatars(document, currentUser)

  return (
    <Link
      to="/v2/library/$documentId"
      params={{ documentId: document.id }}
      className="group flex min-h-[134px] flex-col border border-border bg-card p-3.5 text-card-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <div
        className={cn(
          "mb-1.5 font-mono text-[9px] tracking-[0.01em]",
          DOCUMENT_SCOPE_TEXT[scope],
        )}
      >
        {DOCUMENT_SCOPE_LABEL[scope]}
      </div>
      <h3 className="text-[13px] font-semibold leading-[1.25] tracking-[-0.01em]">
        {document.title}
      </h3>
      {document.description && (
        <p className="mt-[3px] line-clamp-2 text-[10.5px] leading-[1.45] text-muted-foreground">
          {document.description}
        </p>
      )}
      <div className="mt-[9px] pb-2.5 font-mono text-[9.5px] text-muted-foreground/70">
        {sharedByOther ? "Shared" : "Updated"} ·{" "}
        <span className="font-medium text-foreground">
          {formatRelativeTime(document.updated_at ?? document.created_at)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Folder
            className="size-3 shrink-0 text-muted-foreground/70"
            aria-hidden
          />
          <span className="truncate">{document.folder_name ?? "Unfiled"}</span>
        </div>
        <div className="flex shrink-0 items-center">
          {labels.map((label, index) => (
            <span
              key={label}
              className={cn(
                "grid size-[18px] place-items-center border border-card bg-muted text-[9px] font-semibold outline outline-1 outline-border",
                index > 0 && "-ml-1",
              )}
            >
              {label}
            </span>
          ))}
          {overflow > 0 && (
            <span className="-ml-1 grid size-[18px] place-items-center border border-card bg-muted text-[9px] font-semibold outline outline-1 outline-border">
              +{overflow}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/**
 * Expressive "Recently accessed" reel — the top half of the hybrid Library. Shows
 * the most recently updated documents as cards above the folder/file list.
 */
export function LibraryRecentReel({
  documents,
  currentUser,
}: {
  documents: V2DocumentPublic[]
  currentUser: UserPublic
}) {
  const recent = useMemo(
    () =>
      [...documents]
        .sort((a, b) => timestampOf(b) - timestampOf(a))
        .slice(0, MAX_CARDS),
    [documents],
  )

  if (recent.length === 0) return null

  return (
    <section aria-label="Recently accessed" className="shrink-0">
      <div className="mb-3">
        <span className="font-mono text-[10px] tracking-[0.01em] text-foreground">
          Recently accessed
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {recent.map((document) => (
          <RecentCard
            key={document.id}
            document={document}
            currentUser={currentUser}
          />
        ))}
      </div>
    </section>
  )
}
