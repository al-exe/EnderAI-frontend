import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import {
  type AgentSpecialistInvocationSummary,
  type AgentSpecialistSummary,
  getAgent,
} from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AGENT_ROUTE_CHIP_CLASS } from "./agentsTypography"
import { formatRelativeTime } from "./formatters"

const INVOCATION_LIMIT = 3

type Props = {
  agent: AgentSpecialistSummary
}

export function AgentSessionCard({ agent }: Props) {
  const { isDemoMode } = useDemoMode()
  const detailQuery = useQuery({
    queryKey: ["v2-agent-detail", agent.slug, isDemoMode],
    queryFn: () => getAgent(agent.slug, { demo: isDemoMode }),
    staleTime: 30_000,
  })

  const invocations = detailQuery.data?.recent_invocations.slice(
    0,
    INVOCATION_LIMIT,
  )

  return (
    <article
      data-testid="agent-session-card"
      className="group relative flex flex-col border border-border bg-background transition-colors hover:border-foreground/40"
    >
      <Link
        to="/v2/profiles/$slug"
        params={{ slug: agent.slug }}
        aria-label={`Open profile ${agent.name}`}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      />

      <header className="px-4 pt-4 pb-3">
        <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {agent.name}
        </h3>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {agent.role}
        </p>
      </header>

      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {agent.domain_tags.slice(0, 4).map((tag) => (
          <span key={tag} className={AGENT_ROUTE_CHIP_CLASS}>
            {tag.toLowerCase()}
          </span>
        ))}
      </div>

      <div className="border-t border-border/70 px-4 py-3">
        <InvocationList
          isLoading={detailQuery.isLoading}
          invocations={invocations}
        />
      </div>

      <footer className="mt-auto border-t border-border/70 px-4 py-2 text-xs text-muted-foreground">
        <span className="tabular-nums">
          Last invoked {formatRelativeTime(agent.last_invoked_at)}
        </span>
      </footer>
    </article>
  )
}

function InvocationList({
  isLoading,
  invocations,
}: {
  isLoading: boolean
  invocations: AgentSpecialistInvocationSummary[] | undefined
}) {
  if (isLoading || !invocations) {
    return (
      <ul className="space-y-2">
        {Array.from({ length: INVOCATION_LIMIT }).map((_, index) => (
          <li
            key={index}
            className="grid grid-cols-[1fr_auto] items-center gap-3"
          >
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-10" />
          </li>
        ))}
      </ul>
    )
  }

  if (invocations.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No invocations yet.
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {invocations.map((invocation) => (
        <li
          key={invocation.id}
          className={cn(
            "grid grid-cols-[1fr_auto] items-baseline gap-3 text-xs",
          )}
        >
          <span className="truncate text-foreground" title={invocation.prompt}>
            {invocation.prompt}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {formatRelativeTime(invocation.created_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}
