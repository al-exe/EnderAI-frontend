import { Link as RouterLink } from "@tanstack/react-router"

import type { SearchCitationEvent } from "@/lib/searchStream"

export function CitationChip({
  citation,
  index,
}: {
  citation: SearchCitationEvent
  index: number
}) {
  return (
    <RouterLink
      to={citation.url_path}
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
      title={`${citation.title} · score ${citation.score.toFixed(2)}`}
    >
      <span className="text-muted-foreground">[{index}]</span>
      <span className="truncate">{citation.title || citation.source_item_id}</span>
      <span className="text-muted-foreground">#{citation.chunk_anchor_id}</span>
    </RouterLink>
  )
}
