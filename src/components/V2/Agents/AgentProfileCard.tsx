import { Link } from "@tanstack/react-router"
import { Hash } from "lucide-react"

import type { AgentSpecialistSummary } from "@/api/v2Agents"
import { cn } from "@/lib/utils"
import { AgentStatusBadge } from "./AgentStatusBadge"
import { formatCompactNumber, formatRelativeTime } from "./formatters"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function isAgentIdle(agent: AgentSpecialistSummary): boolean {
  if (!agent.last_invoked_at) return true
  const lastUsed = new Date(agent.last_invoked_at).getTime()
  if (Number.isNaN(lastUsed)) return true
  return Date.now() - lastUsed > THIRTY_DAYS_MS
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

type Stat = {
  label: string
  value: string
  /** Lead metric is tinted purple. */
  lead?: boolean
}

function AgentStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="mt-auto grid grid-cols-3 border-t border-border/60">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={cn(
            "py-[11px]",
            index > 0 && "border-l border-border/60 pl-3",
          )}
        >
          <div
            className={cn(
              "font-mono text-[15px] font-semibold tabular-nums tracking-[-0.01em]",
              stat.lead ? "text-[#8447ff]" : "text-foreground",
            )}
          >
            {stat.value}
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] tracking-[0.01em] text-foreground/70">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AgentProfileCard({ agent }: { agent: AgentSpecialistSummary }) {
  const idle = isAgentIdle(agent)
  const topTag = agent.domain_tags[0]
  const stats: Stat[] = [
    {
      label: "Invocations",
      value: agent.invocations_count.toLocaleString(),
      lead: true,
    },
    { label: "Docs", value: agent.linked_docs_count.toLocaleString() },
    { label: "Saved", value: formatCompactNumber(agent.tokens_saved) },
  ]

  return (
    <Link
      to="/v2/profiles/$slug"
      params={{ slug: agent.slug }}
      aria-label={`Open profile ${agent.name}`}
      className="group relative flex min-h-[168px] flex-col border border-border bg-card px-4 pt-[15px] text-card-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <div className="flex items-center gap-[11px]">
        <div className="grid size-[38px] shrink-0 place-items-center bg-muted font-mono text-[13px] font-semibold text-foreground outline outline-1 outline-border">
          {initialsOf(agent.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold tracking-[-0.01em]">
              {agent.name}
            </div>
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

      <AgentStats stats={stats} />

      <div className="-mx-4 flex items-center justify-between gap-2 border-t border-border/60 px-4 py-[9px] font-mono text-[10.5px] tracking-[0.03em] text-muted-foreground/90">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              "size-1.5 shrink-0",
              idle ? "bg-border" : "bg-emerald-600 dark:bg-emerald-400",
            )}
          />
          {formatRelativeTime(agent.last_invoked_at)}
        </div>
        {topTag && (
          <div className="flex min-w-0 items-center gap-1 whitespace-nowrap text-muted-foreground">
            <Hash
              className="size-[11px] shrink-0 text-muted-foreground/70"
              aria-hidden
            />
            <span className="truncate">{topTag.toLowerCase()}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
