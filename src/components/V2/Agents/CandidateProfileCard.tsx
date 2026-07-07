import { Link } from "@tanstack/react-router"
import { Hash, Loader2 } from "lucide-react"

import type { AgentSpecialistSummary } from "@/api/v2Agents"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AgentStatusBadge } from "./AgentStatusBadge"
import { formatCompactNumber, formatRelativeTime } from "./formatters"

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function CandidateProfileCard({
  agent,
  isApproving,
  isDismissing,
  onApprove,
  onDismiss,
}: {
  agent: AgentSpecialistSummary
  isApproving: boolean
  isDismissing: boolean
  onApprove: () => void
  onDismiss: () => void
}) {
  const topTag = agent.domain_tags[0]
  const busy = isApproving || isDismissing

  return (
    <article
      data-testid={`candidate-profile-${agent.slug}`}
      className="flex min-h-[168px] flex-col border border-dashed border-sky-500/40 bg-card px-4 pt-[15px] text-card-foreground"
    >
      <div className="flex items-center gap-[11px]">
        <div className="grid size-[38px] shrink-0 place-items-center bg-sky-500/10 font-mono text-[13px] font-semibold text-sky-700 outline outline-1 outline-sky-500/20 dark:text-sky-400">
          {initialsOf(agent.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/v2/profiles/$slug"
              params={{ slug: agent.slug }}
              className="truncate text-sm font-semibold tracking-[-0.01em] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {agent.name}
            </Link>
            <AgentStatusBadge status={agent.status} className="h-6 shrink-0" />
          </div>
          <div className="mt-[3px] font-mono text-[10px] tracking-[0.01em] text-foreground/70">
            {agent.role}
          </div>
        </div>
      </div>

      {agent.short_description && (
        <p className="mt-3 line-clamp-2 text-[12px] leading-[1.45] text-foreground/80">
          {agent.short_description}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 border-t border-border/60">
        <div className="py-[11px]">
          <div className="font-mono text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-sky-700 dark:text-sky-400">
            {agent.invocations_count.toLocaleString()}
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] tracking-[0.01em] text-foreground/70">
            Invocations
          </div>
        </div>
        <div className="border-l border-border/60 py-[11px] pl-3">
          <div className="font-mono text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
            {agent.linked_docs_count.toLocaleString()}
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] tracking-[0.01em] text-foreground/70">
            Docs
          </div>
        </div>
        <div className="border-l border-border/60 py-[11px] pl-3">
          <div className="font-mono text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
            {formatCompactNumber(agent.tokens_saved)}
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] tracking-[0.01em] text-foreground/70">
            Saved
          </div>
        </div>
      </div>

      <div className="-mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-[9px]">
        <div className="flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] tracking-[0.03em] text-muted-foreground/90">
          <span className="size-1.5 shrink-0 bg-sky-500" />
          Proposed {formatRelativeTime(agent.created_at)}
        </div>
        {topTag && (
          <div className="flex min-w-0 items-center gap-1 whitespace-nowrap font-mono text-[10.5px] tracking-[0.03em] text-muted-foreground">
            <Hash
              className="size-[11px] shrink-0 text-muted-foreground/70"
              aria-hidden
            />
            <span className="truncate">{topTag.toLowerCase()}</span>
          </div>
        )}
      </div>

      <div className="-mx-4 mt-auto flex items-center gap-2 border-t border-border/60 px-4 py-3">
        <Button
          type="button"
          size="sm"
          className="flex-1"
          disabled={busy}
          data-testid={`candidate-approve-${agent.slug}`}
          onClick={onApprove}
        >
          {isApproving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Approving
            </>
          ) : (
            "Approve"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("flex-1", isDismissing && "text-muted-foreground")}
          disabled={busy}
          data-testid={`candidate-dismiss-${agent.slug}`}
          onClick={onDismiss}
        >
          {isDismissing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Dismissing
            </>
          ) : (
            "Dismiss"
          )}
        </Button>
      </div>
    </article>
  )
}
