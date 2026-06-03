import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { Bot, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import {
  type AgentSpecialistStatus,
  type AgentSpecialistSummary,
  listAgents,
} from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentProfileCard } from "@/components/V2/Agents/AgentProfileCard"
import {
  AGENT_EYEBROW_CLASS,
  AGENT_PAGE_TITLE_CLASS,
} from "@/components/V2/Agents/agentsTypography"
import { V2_PAGE_CONTENT, V2_PAGE_FRAME } from "@/components/V2/v2PageShell"
import { cn } from "@/lib/utils"

type AgentScope = "all" | AgentSpecialistStatus

const AGENT_SCOPES: { key: AgentScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
]

export const Route = createFileRoute("/v2/agents")({
  component: TaskforceAgents,
  head: () => ({
    meta: [
      {
        title: "Taskforce | Profiles",
      },
    ],
  }),
})

function AgentsLoading() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex min-h-[168px] flex-col border border-border bg-card px-4 pt-[15px]"
        >
          <div className="flex items-center gap-[11px]">
            <Skeleton className="size-[38px] rounded-none" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-1.5 h-3 w-2/3" />
          <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border/60 pt-3">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ScopeFilterBar({
  agents,
  active,
  onChange,
}: {
  agents: AgentSpecialistSummary[]
  active: AgentScope
  onChange: (scope: AgentScope) => void
}) {
  return (
    <div className="flex flex-wrap items-stretch border-y border-border font-mono text-[10px] uppercase tracking-[0.1em]">
      {AGENT_SCOPES.map((scope) => {
        const count =
          scope.key === "all"
            ? agents.length
            : agents.filter((agent) => agent.status === scope.key).length
        const isActive = scope.key === active
        return (
          <button
            key={scope.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(scope.key)}
            className={cn(
              "flex items-center gap-1.5 border-r border-border px-3 py-2 text-muted-foreground transition-colors hover:text-foreground",
              isActive && "text-foreground shadow-[inset_0_-2px_0_#8447ff]",
            )}
          >
            {scope.label}
            <span className="text-muted-foreground/60">{count}</span>
          </button>
        )
      })}
      <div className="ml-auto border-l border-border px-3 py-2 text-muted-foreground">
        Sort: tokens saved ↓
      </div>
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
  const [scope, setScope] = useState<AgentScope>("all")
  const agentsQuery = useQuery({
    queryKey: ["v2-agents", isDemoMode],
    queryFn: () => listAgents({ demo: isDemoMode }),
  })
  const agents = agentsQuery.data?.items ?? []
  const activeCount = agents.filter((agent) => agent.status === "active").length

  const visible = useMemo(() => {
    const filtered =
      scope === "all"
        ? agents
        : agents.filter((agent) => agent.status === scope)
    return [...filtered].sort((a, b) => b.tokens_saved - a.tokens_saved)
  }, [agents, scope])

  return (
    <section
      className={cn(
        V2_PAGE_FRAME,
        "-mb-6 bg-background font-sans text-foreground md:-mb-8",
      )}
    >
      <div className={V2_PAGE_CONTENT}>
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={AGENT_EYEBROW_CLASS}>
              Agents · {activeCount} active across team
            </div>
            <h1 className={cn("mt-1", AGENT_PAGE_TITLE_CLASS)}>Profiles</h1>
          </div>
          <Button type="button" size="sm" className="w-fit">
            + Profile
          </Button>
        </header>

        <ScopeFilterBar agents={agents} active={scope} onChange={setScope} />

        {agentsQuery.isLoading ? (
          <AgentsLoading />
        ) : agents.length === 0 ? (
          <EmptyAgents isDemoMode={isDemoMode} />
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No profiles match this filter.
          </p>
        ) : (
          <div
            data-testid="agents-card-grid"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {visible.map((agent) => (
              <AgentProfileCard key={agent.id} agent={agent} />
            ))}
          </div>
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
