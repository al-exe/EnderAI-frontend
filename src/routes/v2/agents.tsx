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
import {
  formatCompactNumber,
  formatRelativeTime,
} from "@/components/V2/Agents/formatters"
import { V2_CONTENT_SHELL, V2_PAGE_FRAME } from "@/components/V2/v2PageShell"

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
  return (
    <div className="border-t border-border">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_5.5rem_6rem] gap-4 border-b border-border bg-muted px-1.5 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground max-md:hidden">
        <div>Specialist</div>
        <div>Routing tags</div>
        <div className="text-right">Saved · runs</div>
        <div className="text-right">Last used</div>
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 border-b border-border/60 px-1.5 py-3 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_5.5rem_6rem] md:items-center md:gap-4"
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
        <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
          Total saved
        </div>
        <div className="mt-1 text-lg font-semibold tracking-[-0.01em] tabular-nums">
          {formatCompactNumber(tokensSaved)}{" "}
          <small className="text-[0.68rem] font-medium text-muted-foreground">
            tokens
          </small>
        </div>
      </div>
      <div className="border-b border-border px-3.5 py-3 md:border-r md:border-b-0">
        <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
          Top performer
        </div>
        <div className="mt-1 truncate text-lg font-semibold tracking-[-0.01em]">
          {performer?.name ?? "No specialists"}
        </div>
      </div>
      <div className="px-3.5 py-3">
        <div className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground">
          Idle &gt; 30d
        </div>
        <div className="mt-1 text-lg font-semibold tracking-[-0.01em] tabular-nums">
          {idleCount}{" "}
          <small className="text-[0.68rem] font-medium text-muted-foreground">
            specialists
          </small>
        </div>
      </div>
    </section>
  )
}

function FilterPills() {
  return (
    <div className="flex flex-wrap gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.06em]">
      <span className="border border-zinc-950 bg-zinc-950 px-2 py-1 text-white dark:border-white dark:bg-white dark:text-zinc-950">
        All
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground">
        Mine
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground">
        Org
      </span>
      <span className="border border-border px-2 py-1 text-muted-foreground">
        + New
      </span>
    </div>
  )
}

function AgentRow({ agent }: { agent: AgentSpecialistSummary }) {
  const tags = agent.domain_tags.slice(0, 3)
  const hiddenTagCount = Math.max(0, agent.domain_tags.length - tags.length)
  const idle = isIdle(agent)

  return (
    <article className="group relative grid gap-3 border-b border-border/60 px-1.5 py-3 transition-colors hover:bg-muted/45 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_5.5rem_6rem] md:items-center md:gap-4">
      <Link
        to="/v2/agents/$slug"
        params={{ slug: agent.slug }}
        aria-label={`Open specialist ${agent.name}`}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      />

      <div className="min-w-0">
        <h3 className="truncate text-[0.82rem] font-semibold leading-5 tracking-[-0.01em] text-foreground">
          {agent.name}
        </h3>
        <p className="truncate text-[0.66rem] leading-4 text-muted-foreground">
          {agent.role} · {ownerLabel(agent)}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="border border-border px-1.5 py-0.5 font-mono text-[0.56rem] leading-4 tracking-[0.02em] text-muted-foreground"
          >
            {tag.toLowerCase()}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span className="border border-border px-1.5 py-0.5 font-mono text-[0.56rem] leading-4 tracking-[0.02em] text-muted-foreground">
            +{hiddenTagCount}
          </span>
        )}
      </div>

      <div className="font-mono text-xs tabular-nums text-foreground md:text-right">
        {formatCompactNumber(agent.tokens_saved)}{" "}
        <span className="text-[0.56rem] text-muted-foreground">
          · {agent.invocations_count}
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[0.62rem] text-muted-foreground md:justify-end">
        <span
          className={`size-1.5 ${idle ? "bg-border" : "bg-emerald-600 dark:bg-emerald-400"}`}
        />
        {formatRelativeTime(agent.last_invoked_at)}
      </div>
    </article>
  )
}

function AgentsList({ agents }: { agents: AgentSpecialistSummary[] }) {
  return (
    <div data-testid="agents-grid" className="border-t border-border">
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(10rem,1fr)_5.5rem_6rem] gap-4 border-b border-border bg-muted px-1.5 py-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted-foreground max-md:hidden">
        <div>Specialist</div>
        <div>Routing tags</div>
        <div className="text-right">Saved · runs</div>
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
      <h2 className="mt-5 text-xl font-semibold tracking-tight">
        No specialists yet
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {isDemoMode
          ? "Seeded demo specialists have not been created for this account yet."
          : "Agents will appear here after Taskforce packages reusable specialist knowledge from your work."}
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
      <div className={`${V2_CONTENT_SHELL} gap-4 py-5`}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground">
              Agents · {activeCount} active across team
            </div>
            <h1 className="mt-1 text-[1.38rem] font-semibold leading-8 tracking-[-0.022em]">
              Specialists
            </h1>
            <p className="mt-1 max-w-[50ch] text-[0.7rem] leading-5 text-muted-foreground">
              Reusable expertise packaged from your team's prior work. Routing,
              instructions, evidence, ROI.
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
          <div className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Refreshing specialists
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
