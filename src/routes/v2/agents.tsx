import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router"
import { ArrowRight, Bot, Loader2 } from "lucide-react"

import { type AgentSpecialistSummary, listAgents } from "@/api/v2Agents"
import { useDemoMode } from "@/components/demo-mode-provider"
import { Button } from "@/components/ui/button"
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

const SPARKLINES = [
  "0,18 14,16 28,13 42,14 56,9 70,11 84,7 98,8 112,4 126,5 140,2 154,5",
  "0,12 10,10 20,11 30,8 40,9 50,6 60,7 70,4 80,5 90,3 100,2",
  "0,10 10,11 20,9 30,10 40,8 50,9 60,7 70,8 80,6 90,7 100,5",
  "0,13 10,12 20,10 30,11 40,7 50,8 60,6 70,5 80,6 90,4 100,3",
]

function initials(agent: AgentSpecialistSummary) {
  return agent.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function usdEstimate(tokens: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: tokens > 100_000 ? 0 : 2,
  }).format((tokens * 15) / 1_000_000)
}

function Sparkline({
  points,
  width = 100,
  height = 16,
  className,
}: {
  points: string
  width?: number
  height?: number
  className?: string
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className={className}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function AgentsLoading() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-56 border bg-background" />
      ))}
    </div>
  )
}

function TeamStrip({ agents }: { agents: AgentSpecialistSummary[] }) {
  const tokensSaved = agents.reduce((sum, agent) => sum + agent.tokens_saved, 0)
  const invocationCount = agents.reduce(
    (sum, agent) => sum + agent.invocations_count,
    0,
  )
  const linkedDocsCount = agents.reduce(
    (sum, agent) => sum + agent.linked_docs_count,
    0,
  )
  const activeCount = agents.filter((agent) => agent.status === "active").length
  const reuseRate = linkedDocsCount
    ? Math.min(99, Math.round((invocationCount / linkedDocsCount) * 100))
    : 0

  return (
    <section className="grid border border-zinc-950 bg-zinc-950 text-white md:grid-cols-[1.6fr_1fr_1fr_1fr] dark:border-white/15 dark:bg-black">
      <div className="border-b border-white/15 p-4 md:border-r md:border-b-0">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/55">
          Team tokens saved
        </div>
        <div className="mt-2 text-2xl font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {formatCompactNumber(tokensSaved)}
          <small className="ml-2 text-xs font-medium text-white/55">
            = {usdEstimate(tokensSaved)}
          </small>
        </div>
        <Sparkline
          points={SPARKLINES[0]}
          width={160}
          height={22}
          className="mt-3 text-white"
        />
      </div>
      <div className="border-b border-white/15 p-4 md:border-r md:border-b-0">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/55">
          Active
        </div>
        <div className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {activeCount}
        </div>
        <div className="mt-2 flex items-center gap-1">
          {agents.slice(0, 3).map((agent) => (
            <div
              key={agent.id}
              className="grid size-5 place-items-center border border-white/25 bg-white/10 text-[0.6rem] font-semibold"
            >
              {initials(agent) || "A"}
            </div>
          ))}
          {agents.length > 3 && (
            <div className="grid size-5 place-items-center border border-white/25 bg-white/10 text-[0.6rem] font-semibold">
              +{agents.length - 3}
            </div>
          )}
        </div>
      </div>
      <div className="border-b border-white/15 p-4 md:border-r md:border-b-0">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/55">
          Reuse rate
        </div>
        <div className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {reuseRate}%
        </div>
        <div className="mt-1 font-mono text-[0.68rem] text-emerald-300">
          {invocationCount.toLocaleString()} routed runs
        </div>
      </div>
      <div className="p-4">
        <div className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-white/55">
          Linked docs
        </div>
        <div className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {linkedDocsCount}
        </div>
        <div className="mt-1 font-mono text-[0.68rem] text-amber-200">
          specialist memory
        </div>
      </div>
    </section>
  )
}

function AgentCard({
  agent,
  index,
}: {
  agent: AgentSpecialistSummary
  index: number
}) {
  const tags = agent.domain_tags.slice(0, 3)
  const hiddenTagCount = Math.max(0, agent.domain_tags.length - tags.length)
  const sparkline = SPARKLINES[(index + 1) % SPARKLINES.length]

  return (
    <article className="group relative border border-black/10 bg-white p-4 pl-5 shadow-[0_18px_50px_-42px_rgba(0,0,0,0.9)] transition-transform duration-200 focus-within:-translate-y-0.5 focus-within:border-[#8447ff]/40 hover:-translate-y-0.5 hover:border-[#8447ff]/40 dark:border-white/12 dark:bg-zinc-950">
      <Link
        to="/v2/agents/$slug"
        params={{ slug: agent.slug }}
        aria-label={`Open specialist ${agent.name}`}
        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8447ff]/60"
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-[#8447ff]" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-[1rem] font-semibold tracking-[-0.01em] text-zinc-950 dark:text-white">
            {agent.name}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {agent.role}
          </p>
        </div>
        <div className="flex shrink-0 -space-x-1">
          <div className="grid size-5 place-items-center border border-white bg-zinc-100 text-[0.58rem] font-semibold text-zinc-950 outline outline-1 outline-black/10 dark:border-zinc-950 dark:bg-zinc-900 dark:text-white dark:outline-white/15">
            {initials(agent) || "A"}
          </div>
          <div className="grid size-5 place-items-center border border-white bg-[#8447ff] text-[0.58rem] font-semibold text-white outline outline-1 outline-black/10 dark:border-zinc-950 dark:outline-white/15">
            TF
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[0.66rem] text-zinc-500 dark:text-zinc-400">
        <span className="text-zinc-400 dark:text-zinc-600">route_when:</span>
        {tags.map((tag) => (
          <span
            key={tag}
            className="border border-black/10 px-1.5 py-0.5 text-zinc-900 dark:border-white/12 dark:text-zinc-100"
          >
            {tag.toLowerCase()}
          </span>
        ))}
        {hiddenTagCount > 0 && (
          <span className="border border-black/10 px-1.5 py-0.5 text-zinc-900 dark:border-white/12 dark:text-zinc-100">
            +{hiddenTagCount}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
        {agent.short_description}
      </p>

      <div className="mt-4 grid grid-cols-[1.35fr_0.8fr_0.8fr] border-t border-black/10 pt-3 dark:border-white/12">
        <div className="border-r border-black/10 pr-3 dark:border-white/12">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Tokens saved
          </div>
          <div className="mt-1 font-mono text-[0.95rem] font-semibold tabular-nums text-zinc-950 dark:text-white">
            {formatCompactNumber(agent.tokens_saved)}
            {agent.invocations_count > 0 && (
              <span className="ml-1 text-[0.6rem] text-emerald-600 dark:text-emerald-400">
                live
              </span>
            )}
          </div>
          <Sparkline
            points={sparkline}
            className="mt-1 text-[#8447ff]"
            width={100}
            height={16}
          />
        </div>
        <div className="border-r border-black/10 px-3 dark:border-white/12">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Runs
          </div>
          <div className="mt-1 font-mono text-[0.95rem] font-semibold tabular-nums text-zinc-950 dark:text-white">
            {agent.invocations_count}
          </div>
        </div>
        <div className="pl-3">
          <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
            Docs
          </div>
          <div className="mt-1 font-mono text-[0.95rem] font-semibold tabular-nums text-zinc-950 dark:text-white">
            {agent.linked_docs_count}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-zinc-400 dark:text-zinc-500">
        <span>{formatRelativeTime(agent.last_invoked_at)}</span>
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 text-zinc-950 transition-colors group-hover:text-[#8447ff] dark:text-white"
        >
          Open
          <ArrowRight className="size-3" />
        </span>
      </div>
    </article>
  )
}

function EmptyAgents({ isDemoMode }: { isDemoMode: boolean }) {
  return (
    <div className="border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-white/15 dark:bg-zinc-950">
      <div className="mx-auto grid size-12 place-items-center border border-zinc-200 bg-zinc-50 text-[#8447ff] dark:border-white/15 dark:bg-white/5">
        <Bot className="size-6" />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">
        No specialists yet
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {isDemoMode
          ? "Seeded demo specialists have not been created for this account yet."
          : "Agents will appear here after Taskforce packages reusable specialist knowledge from your work."}
      </p>
    </div>
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

  const { isDemoMode } = useDemoMode()
  const agentsQuery = useQuery({
    queryKey: ["v2-agents", isDemoMode],
    queryFn: () => listAgents({ demo: isDemoMode }),
  })
  const agents = agentsQuery.data?.items ?? []

  return (
    <section
      className={`${V2_PAGE_FRAME} gap-6 bg-white font-sans text-zinc-950 dark:bg-zinc-950 dark:text-white`}
    >
      <div className={`${V2_CONTENT_SHELL} gap-6 py-6`}>
        <header className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              Agents
            </div>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-[0.95] tracking-[-0.045em] md:text-5xl">
              Reusable{" "}
              <em className="not-italic text-[#8447ff]">specialists</em>,
              packaged from your work.
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[0.68rem] uppercase tracking-[0.08em]">
            <Button
              type="button"
              variant="outline"
              className="h-8 border-zinc-950 px-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] dark:border-white/30"
            >
              Sort: impact
            </Button>
            <Button
              type="button"
              disabled
              className="h-8 bg-zinc-950 px-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
            >
              + New specialist
            </Button>
          </div>
        </header>

        <div className="mt-6">
          <TeamStrip agents={agents} />
        </div>

        <div className="mt-4">
          {agentsQuery.isLoading ? (
            <AgentsLoading />
          ) : agents.length > 0 ? (
            <div data-testid="agents-grid" className="grid gap-3 lg:grid-cols-2">
              {agents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} />
              ))}
            </div>
          ) : (
            <EmptyAgents isDemoMode={isDemoMode} />
          )}
        </div>

        {agentsQuery.isFetching && !agentsQuery.isLoading && (
          <div className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            <Loader2 className="size-3 animate-spin" />
            Refreshing specialists
          </div>
        )}
      </div>
    </section>
  )
}
