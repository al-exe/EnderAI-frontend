import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { Bot, Loader2 } from "lucide-react"

import { type AgentSpecialistSummary, listAgents } from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/components/V2/Agents/formatters"
import {
  AGENT_EYEBROW_CLASS,
  AGENT_FEATURE_STRIP_VALUE_CLASS,
  AGENT_NAME_CLASS,
  AGENT_PAGE_TITLE_CLASS,
  AGENT_ROLE_CLASS,
  AGENT_ROUTE_CHIP_CLASS,
  AGENT_STAT_LABEL_CLASS,
  AGENT_TABLE_HEADER_CLASS,
} from "@/components/V2/Agents/agentsTypography"
import { V2_PAGE_CONTENT, V2_PAGE_FRAME } from "@/components/V2/v2PageShell"

export const Route = createFileRoute("/v2/agents")({
  component: TaskforceAgents,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Agents",
      },
    ],
  }),
})

function ownerLabel(agent: AgentSpecialistSummary) {
  const lowerRole = agent.role.toLowerCase()
  if (lowerRole.includes("billing") || lowerRole.includes("frontend")) {
    return "@alex"
  }
  if (lowerRole.includes("search") || lowerRole.includes("retrieval")) {
    return "@team"
  }
  return "org-shared"
}

function isIdle(agent: AgentSpecialistSummary) {
  if (!agent.last_invoked_at) {
    return true
  }

  const lastUsed = new Date(agent.last_invoked_at).getTime()
  if (Number.isNaN(lastUsed)) {
    return true
  }

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  return Date.now() - lastUsed > thirtyDaysMs
}

function topPerformer(agents: AgentSpecialistSummary[]) {
  return agents.reduce<AgentSpecialistSummary | null>((top, agent) => {
    if (!top || agent.tokens_saved > top.tokens_saved) {
      return agent
    }
    return top
  }, null)
}

function AgentsLoading() {
  const cols =
    "grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_6.5rem_5.25rem_6rem]"

  return (
    <div className="border-t border-border">
      <div
        className={`grid ${cols} gap-4 border-b border-border bg-muted px-1.5 py-2 max-md:hidden ${AGENT_TABLE_HEADER_CLASS}`}
      >
        <div>Profile</div>
        <div>Tags</div>
        <div className="text-right">Tokens saved</div>
        <div className="text-right">Invocations</div>
        <div className="text-right">Last used</div>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className={`grid gap-3 border-b border-border/60 px-1.5 py-3 md:grid ${cols} md:items-center md:gap-4`}
        >
          <div>
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-4 w-16 md:ml-auto" />
          <Skeleton className="h-4 w-12 md:ml-auto" />
          <Skeleton className="h-4 w-20 md:ml-auto" />
        </div>
      ))}
    </div>
  )
}

function AgentsFeatureStrip({ agents }: { agents: AgentSpecialistSummary[] }) {
  const tokensSaved = agents.reduce((sum, agent) => sum + agent.tokens_saved, 0)
  const performer = topPerformer(agents)
  const idleCount = agents.filter(isIdle).length

  return (
    <section className="grid border border-border bg-background md:grid-cols-3">
      <div className="border-b border-border px-3.5 py-3 md:border-r md:border-b-0">
        <div className={AGENT_STAT_LABEL_CLASS}>Total saved</div>
        <div className={`mt-1 ${AGENT_FEATURE_STRIP_VALUE_CLASS}`}>
          {formatCompactNumber(tokensSaved)}{" "}
          <small className="text-xs font-medium text-muted-foreground">
            tokens
          </small>
        </div>
      </div>
      <div className="border-b border-border px-3.5 py-3 md:border-r md:border-b-0">
        <div className={AGENT_STAT_LABEL_CLASS}>Top performer</div>
        <div className={`mt-1 truncate text-base font-semibold`}>
          {performer?.name ?? "No profiles"}
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className={AGENT_STAT_LABEL_CLASS}>Idle &gt; 30d</div>
        <div className={`mt-1 ${AGENT_FEATURE_STRIP_VALUE_CLASS}`}>
          {idleCount}{" "}
          <small className="text-xs font-medium text-muted-foreground">
            profiles
          </small>
        </div>
      </div>
    </section>
  )
}

function FilterPills() {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs uppercase tracking-wide">
      <span className="border border-zinc-950 bg-zinc-950 px-2 py-1 text-white dark:border-white dark:bg-white dark:text-zinc-950">
        All
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground">
        Mine
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground">
        Team
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground normal-case">
        + Create profile
      </span>
    </div>
  )
}

function AgentRow({ agent }: { agent: AgentSpecialistSummary }) {
  const tags = agent.domain_tags.slice(0, 3)
  const hiddenTagCount = Math.max(0, agent.domain_tags.length - tags.length)
  const idle = isIdle(agent)

  return (
    <article className="group relative grid gap-3 border-b border-border/60 px-1.5 py-3 transition-colors hover:bg-muted/45 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_6.5rem_5.25rem_6rem] md:items-center md:gap-4">
      <Link
        to="/v2/agents/$slug"
        params={{ slug: agent.slug }}
        aria-label={`Open profile ${agent.name}`}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      />

      <div className="min-w-0">
        <h3 className={cn("truncate", AGENT_NAME_CLASS)}>{agent.name}</h3>
        <p className={cn("truncate", AGENT_ROLE_CLASS)}>
          {agent.role} · {ownerLabel(agent)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className={AGENT_ROUTE_CHIP_CLASS}
          >
            {tag.toLowerCase()}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span className={AGENT_ROUTE_CHIP_CLASS}>+{hiddenTagCount}</span>
        )}
      </div>

      <div className="text-sm tabular-nums text-foreground md:text-right">
        {formatCompactNumber(agent.tokens_saved)}
      </div>

      <div className="text-sm tabular-nums text-foreground md:text-right">
        {agent.invocations_count.toLocaleString()}
      </div>

      <div className="ml-auto grid w-[7.25rem] grid-cols-[0.375rem_minmax(0,1fr)] items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={`size-1.5 shrink-0 ${idle ? "bg-border" : "bg-emerald-600 dark:bg-emerald-400"}`}
        />
        <span className="truncate text-right">
          {formatRelativeTime(agent.last_invoked_at)}
        </span>
      </div>
    </article>
  )
}

function AgentsList({ agents }: { agents: AgentSpecialistSummary[] }) {
  const cols =
    "grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_6.5rem_5.25rem_6rem]"

  return (
    <div data-testid="agents-grid" className="border-t border-border">
      <div
        className={`grid ${cols} gap-4 border-b border-border bg-muted px-1.5 py-2 max-md:hidden ${AGENT_TABLE_HEADER_CLASS}`}
      >
        <div>Profile</div>
        <div>Tags</div>
        <div className="text-right">Tokens saved</div>
        <div className="text-right">Invocations</div>
        <div className="text-right">Last used</div>
      </div>

      {agents.map((agent) => (
        <AgentRow key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

function EmptyAgents({ isDemoMode }: { isDemoMode: boolean }) {
  return (
    <div className="border border-dashed border-border bg-background p-10 text-center">
      <div className="mx-auto grid size-12 place-items-center border border-border bg-muted text-primary">
        <Bot className="size-6" />
      </div>
      <h2 className={cn("mt-5", AGENT_PAGE_TITLE_CLASS)}>No profiles yet</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {isDemoMode
          ? "Seeded demo profiles have not been created for this account yet."
          : "Agents will appear here after Taskforce packages reusable profile knowledge from your work."}
      </p>
    </div>
  )
}

function AgentsIndex() {
  const { isDemoMode } = useDemoMode()
  const agentsQuery = useQuery({
    queryKey: ["v2-agents", isDemoMode],
    queryFn: () => listAgents({ demo: isDemoMode }),
  })
  const agents = agentsQuery.data?.items ?? []
  const activeCount = agents.filter((agent) => agent.status === "active").length

  return (
    <section
      className={`${V2_PAGE_FRAME} bg-background font-sans text-foreground`}
    >
      <div className={V2_PAGE_CONTENT}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={AGENT_EYEBROW_CLASS}>
              Agents · {activeCount} active across team
            </div>
            <h1 className={cn("mt-1", AGENT_PAGE_TITLE_CLASS)}>Profiles</h1>
            <p className="mt-1 max-w-[50ch] text-sm leading-5 text-muted-foreground">
              Reusable profiles packaged from your team's prior work.
            </p>
          </div>
          <FilterPills />
        </header>

        <AgentsFeatureStrip agents={agents} />

        {agentsQuery.isLoading ? (
          <AgentsLoading />
        ) : agents.length > 0 ? (
          <AgentsList agents={agents} />
        ) : (
          <EmptyAgents isDemoMode={isDemoMode} />
        )}

        {agentsQuery.isFetching && !agentsQuery.isLoading && (
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Refreshing profiles
          </div>
        )}
      </div>
    </section>
  )
}

function TaskforceAgents() {
  const router = useRouterState()
  const pathname = router.location.pathname

  // Child route /v2/agents/$slug renders via Outlet (same pattern as library).
  if (
    pathname.startsWith("/v2/agents/") &&
    pathname.replace(/\/+$/, "") !== "/v2/agents"
  ) {
    return <Outlet />
  }

  return <AgentsIndex />
}
